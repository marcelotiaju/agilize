import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const batches = await prisma.bankIntegrationBatch.findMany({
            include: {
                config: { select: { name: true } },
                financialEntity: { select: { name: true } },
                importedByUser: { select: { name: true } },
                _count: { select: { rows: true } }
            },
            orderBy: { importedAt: 'desc' }
        })

        return NextResponse.json(batches)
    } catch (error) {
        console.error("Erro ao buscar importações:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
