import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import * as XLSX from 'xlsx-js-style'

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
                config: { 
                    include: { 
                        destinationColumns: {
                            orderBy: { id: 'asc' }
                        } 
                    } 
                },
                rows: { where: { isValid: true }, orderBy: { rowIndex: 'asc' } }
            }
        })

        if (!batch) return new NextResponse("Lote não encontrado", { status: 404 })

        const cols = batch.config.destinationColumns
        const headers = cols.map(c => c.name)

        const excelRows = batch.rows.map(row => {
            const dest = JSON.parse(row.destinationData || "{}")
            const rowData: Record<string, any> = {}
            cols.forEach(c => {
                rowData[c.name] = dest[c.code] ?? ''
            })
            return rowData
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(excelRows)

        // Apply styles: Font Calibri 10 for all cells
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c })
                const cell = ws[cellRef]
                if (!cell) continue

                cell.s = {
                    font: { name: 'Calibri', sz: 10 },
                    alignment: { vertical: 'center' }
                }

                // If header, keep it centered by default or left? Let's follow a clean style.
                if (r === 0) {
                     cell.s.font.bold = true
                     cell.s.alignment.horizontal = 'center'
                }
            }
        }

        // Set column widths
        ws['!cols'] = headers.map(() => ({ wch: 20 }))

        XLSX.utils.book_append_sheet(wb, ws, "Dados_Exportados")

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" })

        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="exportacao_${batch.sequentialNumber}.xlsx"`
            }
        })
    } catch (error) {
        console.error("Erro ao exportar lote:", error)
        return new NextResponse("Erro interno", { status: 500 })
    }
}
