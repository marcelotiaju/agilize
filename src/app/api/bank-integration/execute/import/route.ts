import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { evaluateTransformation, TransformContext } from "@/lib/transformation-engine"
import { parseTransformation } from "@/lib/transformation-types"

function simpleCSVParse(csv: string): Record<string, string>[] {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l)
    if (lines.length === 0) return []

    // Auto detect delimiter between ',' and ';' based on the first line
    const firstLine = lines[0]
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))

    const data: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => {
            obj[h] = row[idx] ?? ""
        })
        data.push(obj)
    }
    return data
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!session || !userId || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const configId = formData.get('configId') as string

        if (!file || !configId) {
            return NextResponse.json({ error: "Arquivo ou Configuração ausentes" }, { status: 400 })
        }

        const config = await prisma.bankIntegrationConfig.findUnique({
            where: { id: configId },
            include: { destinationColumns: true, sourceColumns: true }
        })

        if (!config) {
            return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 })
        }

        const text = await file.text()
        const rows = simpleCSVParse(text)

        let validCount = 0
        let invalidCount = 0

        const batchRows = []

        // Create context DB fields lookup cache since it usually doesn't change
        const lookupCache = new Map<string, string | null>()

        // Find congregation context (assume tied to the config's financial entity)
        const entity = await prisma.financialEntity.findUnique({
            where: { id: config.financialEntityId }
        })
        const congregationId = entity?.congregationId

        const contextBase = {
            congregationId,
            lookupCache,
            config: {
                financialEntityId: config.financialEntityId,
                paymentMethodId: config.paymentMethodId,
                accountPlan: config.accountPlan,
                launchType: config.launchType
            }
        }

        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i]
            const ctx: TransformContext = { ...contextBase, row: rawRow, dbFields: {} }
            const destData: Record<string, string> = {}
            let isValid = true
            let errorMsg = ""

            for (const col of config.destinationColumns) {
                const step = parseTransformation(col.transformation)
                if (step) {
                    try {
                        const val = await evaluateTransformation(step, ctx)
                        destData[col.code] = val
                    } catch (e: any) {
                        destData[col.code] = ""
                        isValid = false
                        errorMsg += `Erro em coluna [${col.code}]: ${(e as Error).message}. `
                    }
                } else {
                    destData[col.code] = ""
                }
            }

            // Simple validation: must have values required for Launch (value, date, etc depending on mapping logic)
            if (isValid) {
                // Actually, let's just mark valid unless we specifically fail evaluation
                validCount++
            } else {
                invalidCount++
            }

            batchRows.push({
                rowIndex: i + 1,
                sourceData: JSON.stringify(rawRow),
                destinationData: JSON.stringify(destData),
                isValid,
                errorMsg: errorMsg || null,
                isIntegrated: false
            })
        }

        const batch = await prisma.bankIntegrationBatch.create({
            data: {
                configId: config.id,
                financialEntityId: config.financialEntityId,
                paymentMethodId: config.paymentMethodId,
                importedByUserId: userId as string,
                status: "PENDING",
                fileName: file.name,
                rows: {
                    create: batchRows
                }
            }
        })

        return NextResponse.json({
            batchId: batch.id,
            sequentialNumber: batch.sequentialNumber,
            totalRows: rows.length,
            validCount,
            invalidCount
        })

    } catch (error) {
        console.error("Erro ao importar CSV:", error)
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
    }
}
