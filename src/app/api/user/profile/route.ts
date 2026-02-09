
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const payload = await request.json()
        const { image } = payload

        // Apenas permite atualizar a imagem por enquanto (pode expandir)
        const updatedUser = await prisma.user.update({
            where: { id: (session.user as any).id },
            data: {
                image
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const userId = (session.user as any).id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                congregations: {
                    include: {
                        congregation: true
                    }
                },
                profile: true
            }
        })

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Erro ao buscar perfil:', error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
}
