import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { getRowValue } from "@/lib/transformation-engine"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const prisma = await getDb(request)

    const batch = await prisma.bankIntegrationBatch.findUnique({
        where: { id },
        include: {
            config: {
                include: { sourceColumns: true }
            },
            rows: {
                select: { rowIndex: true, sourceData: true, isValid: true },
                orderBy: { rowIndex: 'asc' },
                take: 20 // Only first 20 rows for inspection
            }
        }
    })

    if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })

    const filters = (batch.config as any).filters || []

    const rowDiagnostics = batch.rows.map(row => {
        const source = JSON.parse(row.sourceData || "{}")
        const sourceKeys = Object.keys(source)

        const filterResults = filters.map((f: any) => {
            const val = getRowValue(source, f.field)
            let match = false
            switch (f.operator) {
                case '=': match = val === String(f.value || '').trim(); break
                case '!=': match = val !== String(f.value || '').trim(); break
                case 'startsWith': match = val.toLowerCase().startsWith(String(f.value || '').toLowerCase()); break
                case 'contains': match = val.toLowerCase().includes(String(f.value || '').toLowerCase()); break
                case 'present': match = !!val && val.trim() !== ''; break
                case 'empty': match = !val || val.trim() === ''; break
                default: match = true
            }
            return {
                field: f.field,
                operator: f.operator,
                value: f.value,
                rawValueInRow: source[f.field], // exact key lookup
                resolvedValue: val,              // after getRowValue normalization
                match
            }
        })

        const passes = filterResults.every((r: any) => r.match)

        return {
            rowIndex: row.rowIndex,
            isValid: row.isValid,
            passesFilter: passes,
            sourceKeys,
            filterResults
        }
    })

    const passCount = rowDiagnostics.filter(r => r.passesFilter).length
    const failCount = rowDiagnostics.filter(r => !r.passesFilter).length

    return NextResponse.json({
        batchId: id,
        configName: batch.config.name,
        filtersConfigured: filters,
        filtersCount: filters.length,
        rowsAnalyzed: rowDiagnostics.length,
        passCount,
        failCount,
        note: filters.length === 0
            ? "⚠️ NENHUM FILTRO CONFIGURADO — todas as linhas passam"
            : `✅ ${filters.length} filtro(s) configurado(s)`,
        rows: rowDiagnostics
    })
}
