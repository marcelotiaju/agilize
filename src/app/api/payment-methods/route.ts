import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    try {
        const paymentMethods = await prisma.paymentMethod.findMany({
            orderBy: { id: 'asc' }
        })
        return NextResponse.json(paymentMethods)
    } catch (error) {
        console.error("Erro ao buscar formas de pagamento:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const { id, name } = await request.json()
        if (!id || !name) return NextResponse.json({ error: "Código e Nome são obrigatórios" }, { status: 400 })

        const existing = await prisma.paymentMethod.findUnique({ where: { id: Number(id) } })
        if (existing) return NextResponse.json({ error: "Código já existe" }, { status: 400 })

        const paymentMethod = await prisma.paymentMethod.create({
            data: { id: Number(id), name }
        })
        return NextResponse.json(paymentMethod, { status: 201 })
    } catch (error) {
        console.error("Erro ao criar forma de pagamento:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const { id, name } = await request.json()
        if (!id || !name) return NextResponse.json({ error: "Código e Nome são obrigatórios" }, { status: 400 })

        const paymentMethod = await prisma.paymentMethod.update({
            where: { id: Number(id) },
            data: { name }
        })
        return NextResponse.json(paymentMethod)
    } catch (error) {
        console.error("Erro ao atualizar forma de pagamento:", error)
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

        await prisma.paymentMethod.delete({ where: { id: Number(id) } })
        return NextResponse.json({ message: "Excluído com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir forma de pagamento:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
