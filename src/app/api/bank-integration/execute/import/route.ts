import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { evaluateTransformation, TransformContext } from "@/lib/transformation-engine"
import { parseTransformation } from "@/lib/transformation-types"

/**
 * Robustly splits a CSV line considering quoted fields with delimiters inside.
 */
function splitCSVLine(line: string, delimiter: string): string[] {
    const result = []
    let start = 0
    let inQuotes = false
    const sLine = line.trim()
    
    for (let i = 0; i < sLine.length; i++) {
        const char = sLine[i]
        if (char === '"') {
            if (inQuotes && sLine[i + 1] === '"') {
                i++
                continue
            }
            inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
            result.push(sLine.substring(start, i).trim().replace(/^"|"$/g, '').replace(/""/g, '"').trim())
            start = i + 1
        }
    }
    result.push(sLine.substring(start).trim().replace(/^"|"$/g, '').replace(/""/g, '"').trim())
    return result
}

function robustCSVParse(csv: string, sourceConfigs: { code: string, name: string }[]): Record<string, string>[] {
    const cleanCSV = csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    const lines = cleanCSV.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length === 0) return []

    const firstLine = lines[0]
    const candidates = [';', ',', '\t']
    let delimiter = ';' 
    let maxCols = -1
    
    candidates.forEach(c => {
        const cols = firstLine.split(c).length
        if (cols > maxCols) {
            maxCols = cols
            delimiter = c
        }
    })

    const rawHeaders = splitCSVLine(lines[0], delimiter)
    
    console.log(`[CSV Import] Delimiter: ${delimiter}`)
    console.log(`[CSV Import] Raw Headers:`, rawHeaders)

    // Build a map of Header Name -> Index for name-based lookup
    const headerMap = new Map<string, number>()
    rawHeaders.forEach((h, i) => headerMap.set(normalizeHeader(h), i))

    const data: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i], delimiter)
        if (values.length < 1) continue
        
        const obj: Record<string, string> = {}
        
        // Strategy: Match by Config Name first, then fallback to positional
        sourceConfigs.forEach((configCol, idx) => {
            const normConfigName = normalizeHeader(configCol.name)
            const normConfigCode = normalizeHeader(configCol.code)
            
            let fileIdx = headerMap.get(normConfigName)
            if (fileIdx === undefined) fileIdx = headerMap.get(normConfigCode)
            if (fileIdx === undefined) fileIdx = idx // Fallback to positional

            obj[configCol.code] = (values[fileIdx] || "").trim()
            
            // Keep track of raw value for debugging
            if (fileIdx < rawHeaders.length) {
                obj[`_raw_${rawHeaders[fileIdx]}`] = (values[fileIdx] || "").trim()
            }
        })
        
        data.push(obj)
    }
    return data
}

function normalizeHeader(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!session || !userId || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const prisma = await getDb(request)

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const configId = formData.get('configId') as string

        if (!file || !configId) {
            return NextResponse.json({ error: "Arquivo ou Configuração ausentes" }, { status: 400 })
        }

        const config = await prisma.bankIntegrationConfig.findUnique({
            where: { id: configId },
            include: { 
                destinationColumns: { orderBy: { id: 'asc' } }, 
                sourceColumns: { orderBy: { id: 'asc' } } 
            }
        })

        if (!config) {
            return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 })
        }

        const text = await file.text()
        const rows = robustCSVParse(text, config.sourceColumns)

        if (rows.length === 0) {
            return NextResponse.json({ error: "O arquivo está vazio ou o formato não foi reconhecido." }, { status: 400 })
        }

        let validCount = 0
        let invalidCount = 0
        const batchRows = []
        const lookupCache = new Map<string, string | null>()

        const entity = await prisma.financialEntity.findUnique({
            where: { id: config.financialEntityId }
        })
        const congregationId = entity?.congregationId

        const contextBase = {
            congregationId,
            lookupCache,
            config: {
                financialEntityId: config.financialEntityId,
                paymentMethodId: config.paymentMethodId,
                accountPlan: config.accountPlan,
                launchType: config.launchType
            }
        }

        console.log(`[CSV Import] Starting transformation for ${rows.length} rows...`)

        const filters = (config.filters as any[]) || []
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

        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i]
            
            // Apply Filters
            let isRowFiltered = true
            let filterReason = ""
            for (const filter of filters) {
                const val = getRowValue(rawRow, filter.field)
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
                    isRowFiltered = false
                    filterReason = `Filtro: ${filter.field} ${filter.operator} "${filter.value}"`
                    break
                }
            }

            const ctx: TransformContext = { ...contextBase, row: rawRow, dbFields: {} }
            const destData: Record<string, string> = {}
            let isRowValid = isRowFiltered
            let rowErrorMsg = filterReason

            for (const col of config.destinationColumns) {
                const step = parseTransformation(col.transformation)
                if (step) {
                    try {
                        const val = await evaluateTransformation(step, ctx)
                        destData[col.code] = val
                        
                        if (!val && step.type !== 'FIXED') {
                             // console.log(`[Import] Campo vazio p/ destino ${col.code}`)
                        }
                    } catch (e: any) {
                        destData[col.code] = ""
                        isRowValid = false
                        rowErrorMsg += `${col.name}: ${(e as Error).message}. `
                    }
                } else {
                    destData[col.code] = ""
                }
            }

            if (isRowValid) validCount++
            else invalidCount++

            // Identification of Contributor for UI cache - Deterministic via Config
            let rowContributorId: string | null = null
            let rowContributorName: string | null = null

            // Detect columns mapped to Contributor via LOOKUP
            const contributorCols = config.destinationColumns.filter(c => {
                const step = parseTransformation(c.transformation)
                return step?.type === 'LOOKUP' && step.searchTable === 'Contributor'
            })

            // 1. Try to find a real ID/Link from LOOKUP results
            for (const col of contributorCols) {
                const val = destData[col.code]
                if (val && val.trim()) {
                    const step = parseTransformation(col.transformation)
                    // If the lookup was returning ID or code, try to fetch the actual ID
                    if (step?.returnField === 'id' || step?.returnField === 'code') {
                         const s = val.trim()
                         const ct = await prisma.contributor.findFirst({
                             where: { OR: [{ id: s }, { code: s }] }
                         })
                         if (ct) {
                             rowContributorId = ct.id
                             rowContributorName = ct.name
                             break;
                         }
                    }
                }
            }

            // 2. If no ID found, try to find a Name from the designated name column
            if (!rowContributorId) {
                const nameCol = contributorCols.find(c => {
                    const step = parseTransformation(c.transformation)
                    return step?.returnField === 'name'
                })
                if (nameCol && destData[nameCol.code]) {
                    rowContributorName = destData[nameCol.code].trim()
                } else {
                    // Fallback to keyword search for Name ONLY if config is ambiguous
                    const keywords = ['contribuinte', 'nome', 'contributor', 'name']
                    for (const col of config.destinationColumns) {
                        const nk = col.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                        if (keywords.some(kw => nk.includes(kw)) && destData[col.code]) {
                            rowContributorName = destData[col.code].trim()
                            break;
                        }
                    }
                }
            }

            batchRows.push({
                rowIndex: i + 1,
                sourceData: JSON.stringify(rawRow),
                destinationData: JSON.stringify(destData),
                isValid: isRowValid,
                errorMsg: rowErrorMsg || null,
                isIntegrated: false,
                contributorId: rowContributorId,
                contributorName: rowContributorName
            })
        }

        const batch = await prisma.bankIntegrationBatch.create({
            data: {
                configId: config.id,
                financialEntityId: config.financialEntityId,
                paymentMethodId: config.paymentMethodId,
                importedByUserId: userId as string,
                status: "PENDING",
                fileName: file.name,
                rows: {
                    create: batchRows
                }
            }
        })

        return NextResponse.json({
            batchId: batch.id,
            sequentialNumber: batch.sequentialNumber,
            totalRows: rows.length,
            validCount,
            invalidCount
        })

    } catch (error) {
        console.error("Erro na importação:", error)
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
    }
}
