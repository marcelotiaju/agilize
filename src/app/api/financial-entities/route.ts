import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    try {
        const prisma = await getDb(request)
        const { searchParams } = new URL(request.url)
        const congregationId = searchParams.get('congregationId')

        const where: any = {}
        if (congregationId && congregationId !== 'all') where.congregationId = congregationId

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
        const prisma = await getDb(request)
        const { id, name, congregationId } = await request.json()
        if (!id || !name || !congregationId) {
            return NextResponse.json({ error: "Código, Nome e Congregação são obrigatórios" }, { status: 400 })
        }

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
        const prisma = await getDb(request)
        const { id, name, congregationId } = await request.json()
        if (!id || !name || !congregationId) {
            return NextResponse.json({ error: "Código, Nome e Congregação são obrigatórios" }, { status: 400 })
        }

        const currentEntity = await prisma.financialEntity.findUnique({ where: { id: Number(id) } })
        if (!currentEntity) return NextResponse.json({ error: "Entidade não encontrada" }, { status: 404 })

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
        const prisma = await getDb(request)
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

        const entity = await prisma.financialEntity.findUnique({ where: { id: Number(id) } })
        if (!entity) return NextResponse.json({ error: "Entidade não encontrada" }, { status: 404 })

        await prisma.financialEntity.delete({ where: { id: Number(id) } })
        return NextResponse.json({ message: "Excluído com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir entidade financeira:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
