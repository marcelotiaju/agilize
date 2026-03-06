import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    try {
        const { searchParams } = new URL(request.url)
        const congregationId = searchParams.get('congregationId')

        // Buscar apenas congregações vinculadas ao usuário
        const userCongregations = await prisma.userCongregation.findMany({
            where: { userId: session.user.id },
            select: { congregationId: true }
        })
        const allowedIds = userCongregations.map(uc => uc.congregationId)

        const where: any = {
            congregationId: { in: allowedIds }
        }

        if (congregationId && congregationId !== 'all') {
            // Verifica se o ID solicitado está entre os permitidos
            if (allowedIds.includes(congregationId)) {
                where.congregationId = congregationId
            } else {
                return NextResponse.json([], { status: 200 }) // Busca específica fora do acesso
            }
        }

        const financialEntities = await prisma.financialEntity.findMany({
            where,
            include: { congregation: { select: { name: true } } },
            orderBy: { id: 'asc' }
        })
        return NextResponse.json(financialEntities)
    } catch (error) {
        console.error("Erro ao buscar entidades financeiras:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const { id, name, congregationId } = await request.json()
        if (!id || !name || !congregationId) {
            return NextResponse.json({ error: "Código, Nome e Congregação são obrigatórios" }, { status: 400 })
        }

        // Validar se o usuário tem acesso à congregação
        const access = await prisma.userCongregation.findFirst({
            where: { userId: session.user.id, congregationId }
        })
        if (!access) return NextResponse.json({ error: "Sem permissão para esta congregação" }, { status: 403 })

        const existing = await prisma.financialEntity.findUnique({ where: { id: Number(id) } })
        if (existing) return NextResponse.json({ error: "Código já existe" }, { status: 400 })

        const financialEntity = await prisma.financialEntity.create({
            data: { id: Number(id), name, congregationId }
        })
        return NextResponse.json(financialEntity, { status: 201 })
    } catch (error) {
        console.error("Erro ao criar entidade financeira:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const { id, name, congregationId } = await request.json()
        if (!id || !name || !congregationId) {
            return NextResponse.json({ error: "Código, Nome e Congregação são obrigatórios" }, { status: 400 })
        }

        // Verificar acesso à nova congregação (se alterada) ou à congregação atual do registro
        const currentEntity = await prisma.financialEntity.findUnique({ where: { id: Number(id) } })
        if (!currentEntity) return NextResponse.json({ error: "Entidade não encontrada" }, { status: 404 })

        const access = await prisma.userCongregation.findFirst({
            where: {
                userId: session.user.id,
                congregationId: { in: [currentEntity.congregationId, congregationId] }
            }
        })

        // Se o usuário não tem acesso nem à congregação antiga nem à nova
        if (!access) return NextResponse.json({ error: "Sem permissão para esta operação" }, { status: 403 })

        const financialEntity = await prisma.financialEntity.update({
            where: { id: Number(id) },
            data: { name, congregationId }
        })
        return NextResponse.json(financialEntity)
    } catch (error) {
        console.error("Erro ao atualizar entidade financeira:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

        const entity = await prisma.financialEntity.findUnique({ where: { id: Number(id) } })
        if (!entity) return NextResponse.json({ error: "Entidade não encontrada" }, { status: 404 })

        // Validar se o usuário tem acesso à congregação da entidade
        const access = await prisma.userCongregation.findFirst({
            where: { userId: session.user.id, congregationId: entity.congregationId }
        })
        if (!access) return NextResponse.json({ error: "Sem permissão para esta congregação" }, { status: 403 })

        await prisma.financialEntity.delete({ where: { id: Number(id) } })
        return NextResponse.json({ message: "Excluído com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir entidade financeira:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
