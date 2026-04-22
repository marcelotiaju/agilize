
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
        return NextResponse.json({ error: "ID do lançamento não fornecido" }, { status: 400 })
    }

    const prisma = await getDb(request)

    try {
        const launch = await prisma.launch.findUnique({
            where: { id }
        })

        if (!launch) {
            return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
        }

        // Verificar permissão no usuário da sessão
        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id },
            include: { profile: true }
        })

        if (!user?.profile?.canToggleLaunchType) {
            return NextResponse.json({ error: "Você não tem permissão para alternar o tipo de lançamento" }, { status: 403 })
        }

        // Restrições de status
        if (launch.status !== 'NORMAL' && launch.status !== 'IMPORTED' && launch.status !== 'INTEGRATED') {
            return NextResponse.json({ error: `Não é possível alterar lançamentos com status ${launch.status}` }, { status: 400 })
        }

        if (launch.summaryId) {
            return NextResponse.json({ error: "Este lançamento já faz parte de um resumo e não pode ser alterado" }, { status: 400 })
        }

        // Toggles apenas entre DIZIMO e CARNE_REVIVER
        if (launch.type !== 'DIZIMO' && launch.type !== 'CARNE_REVIVER') {
            return NextResponse.json({ error: "Apenas lançamentos do tipo Dízimo ou Carnê Reviver podem ser alternados" }, { status: 400 })
        }

        const newType = launch.type === 'DIZIMO' ? 'CARNE_REVIVER' : 'DIZIMO'

        const updatedLaunch = await prisma.launch.update({
            where: { id },
            data: { type: newType }
        })

        return NextResponse.json({ 
            message: `Tipo de lançamento alterado para ${newType === 'DIZIMO' ? 'Dízimo' : 'Carnê Reviver'}`,
            type: newType 
        })
    } catch (error) {
        console.error('Erro ao alternar tipo de lançamento:', error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
