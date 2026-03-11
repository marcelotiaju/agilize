import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return new NextResponse("Não autorizado", { status: 401 })
    }

    try {
        const batch = await prisma.bankIntegrationBatch.findUnique({
            where: { id },
            include: {
                config: { include: { destinationColumns: true } },
                rows: { where: { isValid: true }, orderBy: { rowIndex: 'asc' } }
            }
        })

        if (!batch) return new NextResponse("Lote não encontrado", { status: 404 })

        const cols = batch.config.destinationColumns.sort((a, b) => a.code.localeCompare(b.code))
        const headers = cols.map(c => c.name).join(';')

        const csvRows = batch.rows.map(row => {
            const dest = JSON.parse(row.destinationData || "{}")
            return cols.map(c => `"${(dest[c.code] ?? '').replace(/"/g, '""')}"`).join(';')
        })

        const csvContent = [headers, ...csvRows].join('\n')

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="exportacao_${batch.sequentialNumber}.csv"`
            }
        })
    } catch (error) {
        console.error("Erro ao exportar lote:", error)
        return new NextResponse("Erro interno", { status: 500 })
    }
}
