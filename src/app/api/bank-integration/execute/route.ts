import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

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
            const getRowValue = (row: Record<string, string>, field: string): string => {
                if (!field) return ''
                const val = row[field];
                if (val !== undefined) return String(val).trim();
                const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
                const targetNorm = normalize(field)
                for (const key of Object.keys(row)) {
                    if (normalize(key) === targetNorm) return String(row[key]).trim()
                }
                return ''
            }

            const evaluateFilter = (source: any) => {
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
                    if (!match) return false
                }
                return true
            }

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

            const extractValue = (raw: any) => {
                if (!raw) return 0
                let s = String(raw).trim().replace('R$', '').replace(/\s/g, '')
                if (!s) return 0
                
                if (s.includes(',')) {
                    if (s.includes('.')) s = s.replace(/\./g, '')
                    s = s.replace(',', '.')
                } else if (s.includes('.')) {
                    const parts = s.split('.')
                    if (parts.length > 2) {
                        const lastPart = parts[parts.length - 1]
                        if (lastPart.length === 2 || lastPart.length === 1) {
                            const leading = parts.slice(0, -1).join('')
                            s = leading + '.' + lastPart
                        } else {
                            s = s.replace(/\./g, '')
                        }
                    } else {
                        const lastPart = parts[parts.length - 1]
                        if (lastPart.length === 3) s = s.replace(/\./g, '')
                    }
                }
                const numVal = parseFloat(s)
                return isNaN(numVal) ? 0 : numVal
            }

            for (const row of batch.rows) {
                const source = JSON.parse((row as any).sourceData || "{}")
                
                // Skip rows that don't match filters
                if (!evaluateFilter(source)) continue

                let rowVal = 0
                
                // Priority 1: Destination data
                if (destValueCol) {
                    const dest = JSON.parse(row.destinationData || "{}")
                    rowVal = extractValue(dest[destValueCol.code])
                }
                
                // Priority 2: Use rule-based simple MAP
                if (rowVal === 0 && valueRule) {
                    const trans = valueRule.transformation
                    if (trans) {
                        const parsed = typeof trans === 'string' ? JSON.parse(trans) : trans
                        if (parsed.type === 'MAP' && parsed.field) {
                            rowVal = extractValue(source[parsed.field])
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
                        rowVal = extractValue(source[sourceValueKey])
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
