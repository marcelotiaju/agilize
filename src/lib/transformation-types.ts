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
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function parseTransformation(raw: string | null | undefined): TransformStep | null {
    if (!raw) return null
    try {
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
        case 'LOOKUP': return `Buscar ${step.searchTable} por ${step.searchBy} → ${step.returnField}`
        case 'FALLBACK': return `Fallback (${step.parts?.length ?? 0} etapas)`
        case 'CONCAT': return `Concat (${step.parts?.length ?? 0} partes)`
        case 'FORMAT_DATE': return `Data: ${step.inputFormat} → ${step.outputFormat}`
        case 'CONVERT': return `Converter ${step.sourceField}`
        case 'REPLACE': return `Substituir "${step.find}" em ${step.sourceField}`
        default: return '(vazio)'
    }
}
