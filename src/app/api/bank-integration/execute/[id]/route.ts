import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const batch = await prisma.bankIntegrationBatch.findUnique({
            where: { id },
            include: {
                config: {
                    include: {
                        destinationColumns: { orderBy: { id: 'asc' } },
                        sourceColumns: { orderBy: { id: 'asc' } },
                        launchIntegrationRules: { orderBy: { id: 'asc' } }
                    }
                },
                financialEntity: true,
                rows: true,
                importedByUser: { select: { name: true } }
            }
        })

        if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })

        // Buscar lançamentos integrados para esta batch
        const integratedLaunches = await prisma.launch.findMany({
            where: { integrationBatchId: id },
            include: {
                paymentMethod: true,
                classification: true,
                contributor: true,
                financialEntity: true
            }
        })

        return NextResponse.json({ ...batch, integratedLaunches })
    } catch (error) {
        console.error("Erro ao buscar lote:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const batch = await prisma.bankIntegrationBatch.findUnique({ where: { id } })
        if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })

        if (batch.status === "INTEGRATED") {
            return NextResponse.json({ error: "Lote já integrado não pode ser excluído diretamente" }, { status: 400 })
        }

        await prisma.bankIntegrationBatch.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erro ao excluir lote:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
