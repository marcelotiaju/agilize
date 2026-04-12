// Client-safe types and utilities for the transformation engine.
// This file is safe to import in both client and server components.
// The actual engine (transformation-engine.ts) imports prisma and must stay server-only.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransformType =
    | 'FIXED'
    | 'SOURCE'
    | 'DB_FIELD'
    | 'CONFIG_FIELD'
    | 'LOOKUP'
    | 'CONCAT'
    | 'FORMAT_DATE'
    | 'CONVERT'
    | 'REPLACE'
    | 'FALLBACK'
    | 'CONDITIONAL'

export interface ConditionalRule {
    field: string
    operator: '=' | '<' | '>' | '<=' | '>=' | 'contains' | 'startsWith' | 'endsWith'
    value: string
    result: TransformStep
}

export interface ConvertMap {
    from: string
    to: string
}

export interface TransformStep {
    type: TransformType
    value?: string
    field?: string
    sourceField?: string
    table?: string
    configField?: string
    searchTable?: string
    searchBy?: string
    returnField?: string
    parts?: TransformStep[]
    separator?: string
    inputFormat?: string
    outputFormat?: string
    map?: ConvertMap[]
    default?: string
    find?: string
    replaceWith?: string
    // New lookup specific fields
    searchCondition?: 'MEMBRO' | 'CONGREGADO' | 'NONE'
    fallbackType?: 'EMPTY' | 'SOURCE' | 'FIXED'
    fallbackSourceField?: string
    fallbackValue?: string
    returnEmptyIfFound?: boolean
    cleanFallback?: boolean
    // Conditional fields
    conditions?: ConditionalRule[]
    fallback?: TransformStep
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function parseTransformation(raw: string | null | undefined | object): TransformStep | null {
    if (!raw) return null
    try {
        // If it's already an object (from prisma Json field), return it directly
        if (typeof raw === 'object') {
            return raw as TransformStep
        }
        // If it's a string, parse it
        return JSON.parse(raw) as TransformStep
    } catch {
        return null
    }
}

export function serializeTransformation(step: TransformStep | null | undefined): string {
    if (!step) return ''
    return JSON.stringify(step)
}

export function describeTransformation(step: TransformStep | null | undefined): string {
    if (!step) return '(vazio)'
    switch (step.type) {
        case 'FIXED': return `Fixo: "${step.value}"`
        case 'SOURCE': return `Origem: ${step.field ?? step.sourceField}`
        case 'DB_FIELD': return `BD: ${step.table}.${step.field}`
        case 'CONFIG_FIELD': return `Configuração: ${step.configField}`
        case 'LOOKUP': {
            const cond = step.searchCondition && step.searchCondition !== 'NONE' ? ` [${step.searchCondition}]` : ''
            let fb = ''
            if (step.fallbackType === 'SOURCE') fb = ` (FB: ${step.fallbackSourceField})`
            else if (step.fallbackType === 'FIXED') fb = ` (FB: "${step.fallbackValue}")`
            const effect = step.returnEmptyIfFound ? '→ (Vazio)' : ` → ${step.returnField}`
            const cleaning = step.find ? ` (Limpando "${step.find}")` : ''
            return `Buscar ${step.searchTable}${cond} por ${step.searchBy}${cleaning}${effect}${fb}`
        }
        case 'FALLBACK': return `Fallback (${step.parts?.length ?? 0} etapas)`
        case 'CONCAT': return `Concat (${step.parts?.length ?? 0} partes)`
        case 'FORMAT_DATE': return `Data: ${step.inputFormat} → ${step.outputFormat}`
        case 'CONVERT': return `Converter ${step.sourceField}`
        case 'REPLACE': return `Substituir "${step.find}" em ${step.sourceField}`
        case 'CONDITIONAL': return `Condicional (${step.conditions?.length ?? 0} regra${step.conditions?.length !== 1 ? 's' : ''})`
        default: return '(vazio)'
    }
}
