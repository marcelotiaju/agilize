import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import{ authOptions }from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { defaultPage } = body

    if (!defaultPage) {
      return NextResponse.json({ error: "Página inicial é obrigatória" }, { status: 400 })
    }

    // Atualizar a página inicial do usuário
    await prisma.user.update({
      where: { id: session.user.id },
      data: { defaultPage }
    })

    return NextResponse.json({ message: "Página inicial atualizada com sucesso" })
  } catch (error) {
    console.error("Erro ao atualizar página inicial:", error)
    return NextResponse.json({ error: "Erro ao atualizar página inicial" }, { status: 500 })
  }
}