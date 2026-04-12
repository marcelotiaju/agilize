import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { evaluateTransformation } from "@/lib/transformation-engine"
import { parseTransformation } from "@/lib/transformation-types"

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

        // Process each row with launchIntegrationRules transformations
        const previewRows: any[] = []

        for (const row of batch.rows) {
            const source = JSON.parse(row.sourceData || "{}")

            const filters = (batch.config as any).filters || []
            const getRowValue = (r: Record<string, string>, field: string): string => {
                if (!field) return ''
                const val = r[field];
                if (val !== undefined) return String(val).trim();
                const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
                const targetNorm = normalize(field)
                for (const key of Object.keys(r)) {
                    if (normalize(key) === targetNorm) return String(r[key]).trim()
                }
                return ''
            }

            let matchesFilters = true
            for (const filter of filters) {
                const val = getRowValue(source, filter.field)
                const target = String(filter.value || '').trim()
                let match = false
                switch (filter.operator) {
                    case '=': match = val === target; break
                    case '!=': match = val !== target; break
                    case 'startsWith': match = val.toLowerCase().startsWith(target.toLowerCase()); break
                    case 'contains': match = val.toLowerCase().includes(target.toLowerCase()); break
                    case 'present': match = !!val; break
                    default: match = true
                }
                if (!match) {
                    matchesFilters = false
                    break
                }
            }

            if (!matchesFilters) continue

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
