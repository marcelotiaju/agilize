import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"

export async function POST(
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
                launches: {
                    select: {
                        id: true,
                        summaryId: true
                    }
                }
            }
        })

        if (!batch) {
            return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })
        }

        if (batch.status !== "INTEGRATED") {
            return NextResponse.json({ error: "Este lote não está integrado" }, { status: 400 })
        }

        // Check if any launch is linked to a summary
        const linkedToSummary = batch.launches.some(l => l.summaryId !== null)
        if (linkedToSummary && !session.user.canTechnicalIntervention) {
            return NextResponse.json({ 
                error: "Não é possível desfazer a integração pois existem lançamentos vinculados a resumos aprovados. Use Intervenção Técnica se necessário." 
            }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
            // 1. Revert rows
            await tx.bankIntegrationRow.updateMany({
                where: { batchId: id },
                data: {
                    isIntegrated: false,
                    launchId: null
                }
            })

            // 2. Delete launches
            await tx.launch.deleteMany({
                where: { integrationBatchId: id }
            })

            // 3. Revert batch status
            await tx.bankIntegrationBatch.update({
                where: { id },
                data: { status: "PENDING" }
            })
        }, {
            timeout: 30000 // Give it time for large batches
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erro ao desfazer integração:", error)
        return NextResponse.json({ error: "Erro interno ao processar reversão" }, { status: 500 })
    }
}
