import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { LaunchType, LaunchStatus } from "@prisma/client"
import { parse } from "date-fns"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const batch = await prisma.bankIntegrationBatch.findUnique({
            where: { id },
            include: {
                config: true,
                financialEntity: true,
                rows: { where: { isValid: true, isIntegrated: false } },
                importedByUser: true
            }
        })

        if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })
        if (batch.status === "INTEGRATED") return NextResponse.json({ error: "Lote já integrado" }, { status: 400 })

        const congregationId = batch.financialEntity.congregationId
        if (!congregationId) return NextResponse.json({ error: "Entidade não tem congregação" }, { status: 400 })

        // Process rows into launches
        const launchesToCreate: any[] = []
        for (const row of batch.rows) {
            const dest = JSON.parse(row.destinationData || "{}")

            // Try to extract known fields from the dynamic destination layout
            // We look for common key names in the mapped fields, ignoring case.
            const findKey = (candidates: string[]) => {
                const key = Object.keys(dest).find(k => candidates.includes(k.toLowerCase()))
                return key ? dest[key] : null
            }

            const rawDate = findKey(['data', 'data_lancamento', 'date'])
            const rawValue = findKey(['valor', 'value', 'amount'])
            const rawDesc = findKey(['historico', 'descricao', 'description', 'nome', 'observacao'])
            const rawContributorCode = findKey(['contribuinte', 'codigo_contribuinte', 'contribuinte_id', 'contributor_auth'])

            let parsedDate = new Date()
            if (rawDate) {
                // If it's already YYYY-MM-DD from transformation formatting
                const dt = new Date(rawDate)
                if (!isNaN(dt.getTime())) parsedDate = dt
            }

            let numValue = parseFloat(String(rawValue).replace(',', '.'))
            if (isNaN(numValue)) numValue = 0

            let contributorId = null
            let contributorName = null

            if (rawContributorCode) {
                // We assume rawContributorCode is the internal ID or internal Code since we did a LOOKUP in transformation
                // If the user returned 'code' in LOOKUP, we need to find the contributor by code
                const contrib = await prisma.contributor.findFirst({
                    where: { code: String(rawContributorCode), congregationId }
                })
                if (contrib) {
                    contributorId = contrib.id
                    contributorName = contrib.name
                }
            }

            launchesToCreate.push({
                congregationId,
                type: 'DIZIMO' as LaunchType, // User requirement: "tipo Dízimo"
                date: parsedDate,
                value: numValue,
                description: rawDesc ? String(rawDesc).substring(0, 255) : `Importação Bancária (Lote #${batch.sequentialNumber})`,
                status: 'INTEGRATED' as LaunchStatus, // new status outside summaries
                isIntegrated: true,
                integrationBatchId: batch.id,
                contributorId,
                contributorName,
                createdBy: batch.importedByUserId,
            })
        }

        if (launchesToCreate.length === 0) {
            return NextResponse.json({ error: "Nenhum registro válido para integrar." }, { status: 400 })
        }

        // Execute in a transaction
        await prisma.$transaction(async (tx) => {
            // Create the launches
            await tx.launch.createMany({
                data: launchesToCreate
            })

            // Mark batch as integrated
            await tx.bankIntegrationBatch.update({
                where: { id: batch.id },
                data: { status: "INTEGRATED" }
            })

            // Update rows
            await tx.bankIntegrationRow.updateMany({
                where: { batchId: batch.id, isValid: true },
                data: { isIntegrated: true }
            })
        })

        return NextResponse.json({ success: true, integratedCount: launchesToCreate.length })
    } catch (error) {
        console.error("Erro ao integrar lote:", error)
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
    }
}
