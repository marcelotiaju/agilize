import prisma from "@/lib/prisma"
import { format, parse, isValid } from "date-fns"
import type { TransformStep, ConvertMap } from "@/lib/transformation-types"
export type { TransformStep, TransformType, ConvertMap } from "@/lib/transformation-types"
export { parseTransformation, serializeTransformation, describeTransformation } from "@/lib/transformation-types"

// ─── Context ─────────────────────────────────────────────────────────────────

export interface TransformContext {
    row: Record<string, string>
    dbFields?: Record<string, string>
    lookupCache?: Map<string, string | null>
    congregationId?: string
    config?: Record<string, string | number | null>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRowValue(row: Record<string, string>, field: string): string {
    if (!field) return ''
    
    // 1. Direct match (Fast)
    const val = row[field];
    if (val !== undefined) return String(val).trim();

    // 2. Normalization match (Slow but safe)
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    const targetNorm = normalize(field)
    
    for (const key of Object.keys(row)) {
        if (normalize(key) === targetNorm) return String(row[key]).trim()
    }

    return ''
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export async function evaluateTransformation(
    step: TransformStep,
    ctx: TransformContext
): Promise<string> {
    if (!step) return ''

    switch (step.type) {
        case 'FIXED': return step.value ?? ''

        case 'SOURCE': {
            const fieldName = step.field ?? step.sourceField ?? ''
            return getRowValue(ctx.row, fieldName)
        }

        case 'DB_FIELD': {
            const dbKey = `${step.table}.${step.field}`
            return ctx.dbFields?.[dbKey] ?? ''
        }

        case 'CONFIG_FIELD': {
            const val = String(ctx.config?.[step.configField ?? ''] ?? '')
            if (step.configField === 'launchType') {
                const upperVal = val.toUpperCase().trim()
                if (['DIZIMO', 'OFERTA_CULTO', 'EBD', 'VOTO', 'CAMPANHA', 'MISSAO', 'CIRCULO', 'ENTRADA', 'CARNE_REVIVER', 'CARNE_AFRICA', 'RENDA_BRUTA', 'CREDIT', 'CREDITO', 'C'].includes(upperVal)) return 'C'
                if (['SAIDA', 'DEBIT', 'DEBITO', 'D'].includes(upperVal)) return 'D'
            }
            return val
        }

        case 'LOOKUP': {
            const srcField = step.sourceField ?? step.field ?? ''
            let sourceVal = getRowValue(ctx.row, srcField)
            
            const handleFallback = () => {
                if (step.fallbackType === 'SOURCE' && step.fallbackSourceField) {
                    return getRowValue(ctx.row, step.fallbackSourceField)
                }
                return ''
            }

            if (!sourceVal) return handleFallback()

            const searchBy = (step.searchBy ?? 'cpf').trim()

            // Handle numeric scientific notation
            if (sourceVal.toUpperCase().includes('E+') && !isNaN(Number(sourceVal))) {
                sourceVal = BigInt(Math.round(Number(sourceVal))).toString()
            }

            // Cleanup for documents
            if (['cpf', 'cpfcnpj', 'document'].some(s => searchBy.toLowerCase().includes(s))) {
                sourceVal = sourceVal.replace(/\D/g, '')
                if (searchBy.toLowerCase() === 'cpf' && sourceVal.length > 0 && sourceVal.length < 11) {
                    sourceVal = sourceVal.padStart(11, '0')
                } else if (searchBy.toLowerCase().includes('cnpj') && sourceVal.length > 0 && sourceVal.length < 14) {
                    sourceVal = sourceVal.padStart(14, '0')
                }
            }

            const cacheKey = `${step.searchTable}:${searchBy}:${sourceVal}:${step.searchCondition ?? 'ALL'}:${ctx.congregationId || 'global'}`
            if (!ctx.lookupCache) ctx.lookupCache = new Map()

            if (ctx.lookupCache.has(cacheKey)) {
                return ctx.lookupCache.get(cacheKey) ?? handleFallback()
            }

            let result: string | null = null
            try {
                if (step.searchTable === 'Contributor') {
                    // Try with congregation first
                    let where: any = { [searchBy]: sourceVal }
                    if (ctx.congregationId) where.congregationId = ctx.congregationId
                    
                    // Add condition filter if specified
                    if (step.searchCondition && step.searchCondition !== 'NONE') {
                        where.tipo = step.searchCondition
                    }

                    let record = await (prisma.contributor as any).findFirst({ where })
                    
                    // Fallback to global
                    if (!record) {
                        let globalWhere: any = { [searchBy]: sourceVal }
                        if (step.searchCondition && step.searchCondition !== 'NONE') {
                            globalWhere.tipo = step.searchCondition
                        }
                        record = await (prisma.contributor as any).findFirst({ 
                            where: globalWhere 
                        })
                    }

                    if (record && (step.returnField === 'name' || !step.returnField)) {
                        const pos = (record.ecclesiasticalPosition || '').trim().toUpperCase()
                        const tipo = (record.tipo || '').trim().toUpperCase()
                        
                        const officeMap: Record<string, string> = {
                            'AUXILIAR': 'Aux',
                            'DIÁCONO': 'Dc',
                            'PRESBÍTERO': 'Pb',
                            'EVANGELISTA': 'Ev',
                            'PASTOR': 'Pr',
                        }
                        
                        let cargo = officeMap[pos] || ''
                        if (!cargo) {
                            if (pos === 'CONGREGADO' || tipo === 'CONGREGADO') cargo = 'Congregado'
                            else cargo = 'Membro'
                        }
                        
                        // "DÍZIMOS E OFERTAS DE  -[CARGO] -[NOME] -[CPF]"
                        result = `DÍZIMOS E OFERTAS DE  -${cargo} -${record.name} -${record.cpf || ''}`
                    } else {
                        result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                    }
                } else if (step.searchTable === 'Supplier') {
                    const record = await (prisma.supplier as any).findFirst({
                        where: { [searchBy]: sourceVal }
                    })
                    result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                } else if (step.searchTable === 'Congregation') {
                    const record = await (prisma.congregation as any).findFirst({
                        where: {
                            OR: [
                                { [searchBy]: sourceVal },
                                { code: sourceVal },
                                { name: sourceVal },
                                { name: { contains: sourceVal } }
                            ]
                        }
                    })
                    result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                }
            } catch (e) {
                console.error(`[Engine] Lookup Error on ${step.searchTable}.${searchBy}:`, e)
                result = null
            }

            if (result !== null) {
                console.log(`[Engine] Found: ${step.searchTable}.${searchBy}='${sourceVal}' -> ${result}`);
                
                // Optional: Map the result (e.g. for abbreviations)
                if (step.map && step.map.length > 0) {
                    const mapped = step.map.find(m => m.from === result)
                    if (mapped) result = mapped.to
                }

                if (step.returnEmptyIfFound) return '';
            }

            ctx.lookupCache.set(cacheKey, result)
            return result ?? handleFallback()
        }

        case 'FALLBACK': {
            for (const part of (step.parts ?? [])) {
                const val = await evaluateTransformation(part, ctx)
                if (val && val.trim() !== '') return val
            }
            return ''
        }

        case 'CONCAT': {
            const sep = step.separator ?? ''
            const results: string[] = []
            for (const part of (step.parts ?? [])) {
                const val = await evaluateTransformation(part, ctx)
                if (val && val.trim() !== '') results.push(val)
            }
            return results.join(sep)
        }

        case 'FORMAT_DATE': {
            const srcField = step.sourceField ?? step.field ?? ''
            const rawVal = getRowValue(ctx.row, srcField)
            if (!rawVal) return ''
            try {
                const inputFmt = normalizeFormat(step.inputFormat ?? 'dd/MM/yyyy')
                const outputFmt = normalizeFormat(step.outputFormat ?? 'yyyy-MM-dd')
                const fixedInputFmt = inputFmt.replace(/mm+/g, 'MM').replace(/DD+/g, 'dd').replace(/YYYY+/g, 'yyyy')
                const parsed = parse(rawVal, fixedInputFmt, new Date())
                if (!isValid(parsed)) {
                    const alt = parse(rawVal, "yyyy-MM-dd", new Date())
                    if (isValid(alt)) return format(alt, outputFmt)
                    return rawVal
                }
                return format(parsed, outputFmt)
            } catch {
                return rawVal
            }
        }

        case 'CONVERT': {
            const srcField = step.sourceField ?? step.field ?? ''
            const rawVal = getRowValue(ctx.row, srcField)
            const entry = (step.map ?? []).find(m => m.from === rawVal)
            return entry ? entry.to : (step.default ?? rawVal)
        }

        case 'REPLACE': {
            const srcField = step.sourceField ?? step.field ?? ''
            const rawVal = getRowValue(ctx.row, srcField)
            if (!step.find) return rawVal
            return rawVal.split(step.find).join(step.replaceWith ?? '')
        }

        default: return ''
    }
}

function normalizeFormat(fmt: string): string {
    return fmt
        .replace(/YYYY/g, 'yyyy')
        .replace(/YY/g, 'yy')
        .replace(/DD/g, 'dd')
        .replace(/D/g, 'd')
}
