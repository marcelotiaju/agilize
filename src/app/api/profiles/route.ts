import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const profiles = await prisma.profile.findMany({ orderBy: { name: "asc" } })
    return NextResponse.json(profiles)
  } catch (error) {
    console.error("Erro ao buscar perfis:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.canManageUsers) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const payload = await request.json()
    // name é obrigatório
    if (!payload?.name) return NextResponse.json({ error: "Nome do perfil é obrigatório" }, { status: 400 })
    const profile = await prisma.profile.create({ data: payload })
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar perfil:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.canManageUsers) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const payload = await request.json()
    const { id, ...data } = payload
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    const profile = await prisma.profile.update({ where: { id }, data })
    return NextResponse.json(profile)
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.canManageUsers) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    await prisma.profile.delete({ where: { id } })
    return NextResponse.json({ message: "Excluído" })
  } catch (error) {
    console.error("Erro ao excluir perfil:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}