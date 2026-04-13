import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { evaluateTransformation, evaluateFilter, parseTransformation } from "@/lib/transformation-engine"

/**
 * Preview endpoint - Processes launchIntegrationRules transformations
 * without creating actual launches, to show users what will be integrated
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const prisma = await getDb(request)

    try {
        const batch = await prisma.bankIntegrationBatch.findUnique({
            where: { id },
            include: {
                config: {
                    include: {
                        launchIntegrationRules: true
                    }
                },
                financialEntity: true,
                rows: {
                    where: { isValid: true, isIntegrated: false },
                    orderBy: { rowIndex: 'asc' }
                }
            }
        })

        if (!batch) {
            return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })
        }

        const filters = (batch.config as any).filters || []
        const previewRows: any[] = []

        for (const row of batch.rows) {
            const source = JSON.parse(row.sourceData || "{}")

            if (!evaluateFilter(source, filters)) continue

            // Prepare context for evaluating rules
            const ctxForLaunchRules = {
                row: source,
                dbFields: {},
                config: {
                    financialEntityId: batch.config.financialEntityId,
                    paymentMethodId: batch.config.paymentMethodId,
                    accountPlan: batch.config.accountPlan,
                    launchType: batch.config.launchType
                },
                congregationId: batch.financialEntity.congregationId
            }

            // Evaluate each launchIntegrationRule
            const ruleValues: Record<string, string> = {}
            for (const rule of batch.config.launchIntegrationRules || []) {
                const step = parseTransformation(rule.transformation)
                if (step) {
                    try {
                        const val = await evaluateTransformation(step, ctxForLaunchRules)
                        ruleValues[rule.code] = val
                    } catch (e) {
                        console.error(`Error evaluating rule ${rule.code}:`, e)
                        ruleValues[rule.code] = ''
                    }
                }
            }

            previewRows.push({
                rowId: row.id,
                rowIndex: row.rowIndex,
                contributorId: row.contributorId,
                contributorName: row.contributorName,
                launchRuleValues: ruleValues
            })
        }

        return NextResponse.json({
            batchId: batch.id,
            rowsCount: previewRows.length,
            rows: previewRows
        })
    } catch (error) {
        console.error("Preview error:", error)
        return NextResponse.json({ error: `Erro no preview: ${(error as Error).message}` }, { status: 500 })
    }
}
