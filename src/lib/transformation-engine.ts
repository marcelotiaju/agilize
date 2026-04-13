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

export function getMappedOffice(record: any): string {
    if (!record) return ''
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    const pos = record.ecclesiasticalPosition || ''
    const tipo = record.tipo || ''
    
    const officeMap: Record<string, string> = {
        'auxiliar': 'Aux',
        'diacono': 'Dc',
        'presbitero': 'Pb',
        'evangelista': 'Ev',
        'pastor': 'Pr',
    }
    
    let cargo = officeMap[normalize(pos)] || ''
    if (!cargo) {
        if (normalize(pos) === 'congregado' || normalize(tipo) === 'congregado') cargo = 'Congregado'
        else if (pos || tipo) cargo = 'Membro'
    }
    return cargo
}

export function getRowValue(row: Record<string, string>, field: string): string {
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

export function extractNumericValue(raw: any): number {
    if (!raw) return 0
    let s = String(raw).trim().replace('R$', '').replace(/\s/g, '')
    if (!s) return 0
    
    // Brazilian/International numeric formats heuristic
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

export function evaluateFilter(source: Record<string, string>, filters: any[]): boolean {
    if (!filters || filters.length === 0) return true
    
    for (const filter of filters) {
        const val = getRowValue(source, filter.field)
        const target = String(filter.value || '').trim()
        const op = filter.operator
        let match = false
        
        const isNumeric = (v: string) => {
            if (!v) return false
            const s = v.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
            return !isNaN(Number(s))
        }

        if (['>', '<', '>=', '<='].includes(op)) {
            const nRow = extractNumericValue(val)
            const nRule = extractNumericValue(target)
            switch (op) {
                case '>': match = nRow > nRule; break;
                case '<': match = nRow < nRule; break;
                case '>=': match = nRow >= nRule; break;
                case '<=': match = nRow <= nRule; break;
            }
        } else if (op === '=') {
            if (isNumeric(val) && isNumeric(target)) {
                match = extractNumericValue(val) === extractNumericValue(target)
            } else {
                match = val === target
            }
        } else if (op === '!=') {
            if (isNumeric(val) && isNumeric(target)) {
                match = extractNumericValue(val) !== extractNumericValue(target)
            } else {
                match = val !== target
            }
        } else {
            switch (op) {
                case 'contains': match = val.toLowerCase().includes(target.toLowerCase()); break;
                case 'startsWith': match = val.toLowerCase().startsWith(target.toLowerCase()); break;
                case 'endsWith': match = val.toLowerCase().endsWith(target.toLowerCase()); break;
                case 'present': match = !!val && val.trim() !== ''; break;
                case 'empty': match = !val || val.trim() === ''; break;
                default: match = true; break;
            }
        }
        
        if (!match) return false
    }
    
    return true
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
            const applyCleanup = (val: string) => {
                if (!step.find) return val.trim()
                try {
                    const searchRegex = new RegExp(step.find, 'gi')
                    const replacement = step.replaceWith === 'remove' ? '' : (step.replaceWith || '')
                    return val.replace(searchRegex, replacement).trim()
                } catch (e) {
                    return val.split(step.find).join(step.replaceWith === 'remove' ? '' : (step.replaceWith || '')).trim()
                }
            }

            const handleFallback = () => {
                let fbVal = ''
                if (step.fallbackType === 'SOURCE' && step.fallbackSourceField) {
                    fbVal = getRowValue(ctx.row, step.fallbackSourceField)
                } else if (step.fallbackType === 'FIXED') {
                    fbVal = step.fallbackValue || ''
                }

                if (step.cleanFallback) {
                    return applyCleanup(fbVal)
                }
                return fbVal.trim()
            }

            const srcField = step.sourceField ?? step.field ?? ''
            let sourceVal = getRowValue(ctx.row, srcField)
            if (!sourceVal) return handleFallback()

            const searchBy = (step.searchBy ?? 'cpf').trim()

            // Pre-replacement for cleaning source values before lookup
            sourceVal = applyCleanup(sourceVal)

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

            const retFieldKey = (step.returnField || '').trim().toLowerCase()
            const cacheKey = `${step.searchTable}:${searchBy}:${sourceVal}:${step.searchCondition ?? 'ALL'}:${retFieldKey}:${ctx.congregationId || 'global'}`
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

                    const retField = (step.returnField || '').trim().toLowerCase()
                    const isName = retField === 'name'
                    const isRichDesc = !retField || retField === 'rich_description'
                    const isOfficeField = ['ecclesiasticalposition', 'cargo', 'office', 'mappedposition', 'posicao', 'posicaoeclesiastica'].includes(retField)

                    if (record && isRichDesc) {
                        let cargo = getMappedOffice(record)
                        
                        // Try to apply custom mapping from step.map to the raw office
                        const rawOffice = record.ecclesiasticalPosition || ''
                        if (rawOffice && step.map && step.map.length > 0) {
                            const normRaw = rawOffice.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                            const customMapped = step.map.find(m => {
                                const nm = (m.from || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                                return nm === normRaw
                            })
                            if (customMapped) cargo = customMapped.to
                        }

                        // \"DÍZIMOS E OFERTAS DE  -[CARGO] -[NOME] -[CPF]\"
                        const normalizedName = record.name.toUpperCase()
                        result = `DÍZIMOS E OFERTAS DE  -${cargo} -${normalizedName} -${record.cpf || ''}`
                    } else if (record && isName) {
                        result = record.name
                    } else if (record && isOfficeField) {
                        // Return raw value so that step.map can be correctly applied at the end of lookup
                        const raw = record.ecclesiasticalPosition || ''
                        
                        // BUT, if there's no map in the step, we want the default mapping!
                        if (!step.map || step.map.length === 0) {
                            result = getMappedOffice(record)
                        } else {
                            result = raw
                        }
                    } else {
                        // Find the field in record. If not found, only fallback to code if returnField was not specified
                        const fieldName = step.returnField || 'code'
                        const val = record[fieldName]
                        result = val !== undefined && val !== null ? String(val) : null
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
                    const normResult = result.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                    const mapped = step.map.find(m => {
                        const nm = (m.from || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                        return nm === normResult
                    })
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

        case 'CONDITIONAL': {
            if (!step.conditions || step.conditions.length === 0) {
                return step.fallback ? await evaluateTransformation(step.fallback, ctx) : ''
            }

            for (const rule of step.conditions) {
                const rowVal = getRowValue(ctx.row, rule.field)
                let match = false

                const ruleVal = String(rule.value || '').trim()
                const op = rule.operator

                // Smart compare for numbers
                const isNumeric = (val: string) => {
                    if (!val) return false
                    const s = val.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
                    return !isNaN(Number(s))
                }

                if (['>', '<', '>=', '<='].includes(op)) {
                    const nRow = extractNumericValue(rowVal)
                    const nRule = extractNumericValue(ruleVal)
                    switch (op) {
                        case '>': match = nRow > nRule; break;
                        case '<': match = nRow < nRule; break;
                        case '>=': match = nRow >= nRule; break;
                        case '<=': match = nRow <= nRule; break;
                    }
                } else if (op === '=') {
                    // Se ambos parecem números, compara numericamente
                    if (isNumeric(rowVal) && isNumeric(ruleVal)) {
                        match = extractNumericValue(rowVal) === extractNumericValue(ruleVal)
                    } else {
                        match = rowVal === ruleVal
                    }
                } else if (op === '!=') {
                    if (isNumeric(rowVal) && isNumeric(ruleVal)) {
                        match = extractNumericValue(rowVal) !== extractNumericValue(ruleVal)
                    } else {
                        match = rowVal !== ruleVal
                    }
                } else {
                    switch (op) {
                        case 'contains': match = rowVal.toLowerCase().includes(ruleVal.toLowerCase()); break;
                        case 'startsWith': match = rowVal.toLowerCase().startsWith(ruleVal.toLowerCase()); break;
                        case 'endsWith': match = rowVal.toLowerCase().endsWith(ruleVal.toLowerCase()); break;
                        case 'present': match = !!rowVal && rowVal.trim() !== ''; break;
                        case 'empty': match = !rowVal || rowVal.trim() === ''; break;
                    }
                }

                if (match) {
                    return await evaluateTransformation(rule.result, ctx)
                }
            }

            return step.fallback ? await evaluateTransformation(step.fallback, ctx) : ''
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
