import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { evaluateFilter, extractNumericValue } from "@/lib/transformation-engine"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const batches = await prisma.bankIntegrationBatch.findMany({
            include: {
                config: { 
                    include: { 
                        launchIntegrationRules: true,
                        destinationColumns: true
                    } 
                },
                financialEntity: { select: { name: true } },
                importedByUser: { select: { name: true } },
                rows: { select: { destinationData: true, sourceData: true } },
                _count: { select: { rows: true } }
            },
            orderBy: { importedAt: 'desc' }
        })

        // Manually calculate totals if possible
        const batchesWithTotals = batches.map(batch => {
            let totalAmount = 0
            
            const filters = (batch.config as any).filters || []
            const isValueKey = (nk: string) => {
                const isVal = ['valor', 'value', 'vl', 'total', 'amount', 'pagamento'].some(v => nk.includes(v))
                const isIdOrCode = ['cod', 'num', 'id', 'conta', 'agencia', 'origem'].some(v => nk.includes(v))
                return isVal && !isIdOrCode
            }
            // 1. Try finding by destination columns
            const destCols = (batch.config?.destinationColumns as any[]) || []
            const destValueCol = destCols.find(c => {
                const nk = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                return isValueKey(nk)
            })

            // 2. Try finding by launch rule name
            const rules = (batch.config as any).launchIntegrationRules || []
            const valueRule = rules.find((r: any) => {
                const nk = (r.name || r.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                return isValueKey(nk)
            })

            for (const row of batch.rows) {
                const source = JSON.parse((row as any).sourceData || "{}")
                
                // Skip rows that don't match filters
                if (!evaluateFilter(source, filters)) continue

                let rowVal = 0
                
                // Priority 1: Destination data
                if (destValueCol) {
                    const dest = JSON.parse(row.destinationData || "{}")
                    rowVal = extractNumericValue(dest[destValueCol.code])
                }
                
                // Priority 2: Use rule-based simple MAP
                if (rowVal === 0 && valueRule) {
                    const trans = valueRule.transformation
                    if (trans) {
                        const parsed = typeof trans === 'string' ? JSON.parse(trans) : trans
                        if (parsed.type === 'MAP' && parsed.field) {
                            rowVal = extractNumericValue(source[parsed.field])
                        }
                    }
                }

                // Priority 3: Scan source data for any value-looking field if still 0
                if (rowVal === 0) {
                    const sourceValueKey = Object.keys(source).find(k => {
                        const nk = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                        return isValueKey(nk)
                    })
                    if (sourceValueKey) {
                        rowVal = extractNumericValue(source[sourceValueKey])
                    }
                }
                
                totalAmount += rowVal
            }

            return {
                ...batch,
                totalAmount,
                rows: undefined // Clean up
            }
        })

        return NextResponse.json(batchesWithTotals)
    } catch (error) {
        console.error("Erro ao buscar importações:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
