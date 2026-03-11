import prisma from "@/lib/prisma"
import { format, parse, isValid } from "date-fns"
import type { TransformStep, ConvertMap } from "@/lib/transformation-types"
export type { TransformStep, TransformType, ConvertMap } from "@/lib/transformation-types"
export { parseTransformation, serializeTransformation, describeTransformation } from "@/lib/transformation-types"

// ─── Context ─────────────────────────────────────────────────────────────────

export interface TransformContext {
    // The raw source row from the file — key is the source column code
    row: Record<string, string>
    // DB context fields (optional, already resolved before calling engine)
    dbFields?: Record<string, string>
    // Cache for lookup results to avoid repeated DB calls
    lookupCache?: Map<string, string | null>
    // Congregation ID for scoping lookups
    congregationId?: string
    // Integration config fields (e.g. financialEntityId)
    config?: Record<string, string | number | null>
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * Evaluate a TransformStep recursively and return resulting string value.
 * Returns empty string if transformation cannot be resolved.
 */
export async function evaluateTransformation(
    step: TransformStep,
    ctx: TransformContext
): Promise<string> {
    if (!step) return ''

    switch (step.type) {
        case 'FIXED': {
            return step.value ?? ''
        }

        case 'SOURCE': {
            const key = step.field ?? step.sourceField ?? ''
            return ctx.row[key] ?? ''
        }

        case 'DB_FIELD': {
            const dbKey = `${step.table}.${step.field}`
            return ctx.dbFields?.[dbKey] ?? ''
        }

        case 'CONFIG_FIELD': {
            return String(ctx.config?.[step.configField ?? ''] ?? '')
        }

        case 'LOOKUP': {
            const sourceVal = ctx.row[step.sourceField ?? ''] ?? ''
            if (!sourceVal) return ''

            const cacheKey = `${step.searchTable}:${step.searchBy}:${sourceVal}`
            if (!ctx.lookupCache) ctx.lookupCache = new Map()

            if (ctx.lookupCache.has(cacheKey)) {
                return ctx.lookupCache.get(cacheKey) ?? ''
            }

            let result: string | null = null
            try {
                if (step.searchTable === 'Contributor') {
                    const where: Record<string, unknown> = { [step.searchBy ?? 'cpf']: sourceVal }
                    if (ctx.congregationId) where.congregationId = ctx.congregationId
                    const record = await (prisma.contributor as any).findFirst({ where })
                    result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                } else if (step.searchTable === 'Supplier') {
                    const record = await (prisma.supplier as any).findFirst({
                        where: { [step.searchBy ?? 'cpfCnpj']: sourceVal }
                    })
                    result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                } else if (step.searchTable === 'Congregation') {
                    const record = await (prisma.congregation as any).findFirst({
                        where: { [step.searchBy ?? 'code']: sourceVal }
                    })
                    result = record ? String(record[step.returnField ?? 'code'] ?? '') : null
                }
            } catch {
                result = null
            }

            ctx.lookupCache.set(cacheKey, result)
            return result ?? ''
        }

        case 'FALLBACK': {
            for (const part of (step.parts ?? [])) {
                const val = await evaluateTransformation(part, ctx)
                if (val) return val
            }
            return ''
        }

        case 'CONCAT': {
            const sep = step.separator ?? ''
            const results: string[] = []
            for (const part of (step.parts ?? [])) {
                const val = await evaluateTransformation(part, ctx)
                results.push(val)
            }
            return results.filter(v => v !== '').join(sep)
        }

        case 'FORMAT_DATE': {
            const rawVal = ctx.row[step.sourceField ?? ''] ?? ''
            if (!rawVal) return ''
            try {
                // Build parse format
                const inputFmt = normalizeFormat(step.inputFormat ?? 'dd/MM/yyyy')
                const outputFmt = normalizeFormat(step.outputFormat ?? 'yyyy-MM-dd')
                const parsed = parse(rawVal, inputFmt, new Date())
                if (!isValid(parsed)) return rawVal
                return format(parsed, outputFmt)
            } catch {
                return rawVal
            }
        }

        case 'CONVERT': {
            const rawVal = ctx.row[step.sourceField ?? ''] ?? ''
            const entry = (step.map ?? []).find(m => m.from === rawVal)
            return entry ? entry.to : (step.default ?? rawVal)
        }

        case 'REPLACE': {
            const rawVal = ctx.row[step.sourceField ?? ''] ?? ''
            if (!step.find) return rawVal
            return rawVal.split(step.find).join(step.replaceWith ?? '')
        }

        default:
            return ''
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize user-entered date format to date-fns token format.
 * e.g. 'DDMMYYYY' → 'ddMMyyyy', 'DD/MM/YYYY' → 'dd/MM/yyyy'
 */
function normalizeFormat(fmt: string): string {
    return fmt
        .replace(/YYYY/g, 'yyyy')
        .replace(/DD/g, 'dd')
        .replace(/D/g, 'd')
        .replace(/M/g, 'M')
}
