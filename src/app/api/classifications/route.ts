import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { nextAuthOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const classifications = await prisma.classification.findMany({
      orderBy: {
        code: 'asc'
      }
    })

    return NextResponse.json(classifications)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar classificações" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code, shortCode, description } = body

    if (!code || !shortCode || !description) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    // Verificar se já existe uma classificação com o mesmo código ou reduzido
    const existingClassification = await prisma.classification.findFirst({
      where: {
        OR: [
          { code },
          { shortCode }
        ]
      }
    })

    if (existingClassification) {
      return NextResponse.json({ error: "Já existe uma classificação com este código ou reduzido" }, { status: 400 })
    }

    const classification = await prisma.classification.create({
      data: {
        code,
        shortCode,
        description
      }
    })

    return NextResponse.json(classification, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar classificação" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, code, shortCode, description } = body

    if (!id || !code || !shortCode || !description) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    // Verificar se já existe uma classificação com o mesmo código ou reduzido (exceto a atual)
    const existingClassification = await prisma.classification.findFirst({
      where: {
        OR: [
          { code },
          { shortCode }
        ],
        NOT: {
          id
        }
      }
    })

    if (existingClassification) {
      return NextResponse.json({ error: "Já existe uma classificação com este código ou reduzido" }, { status: 400 })
    }

    const classification = await prisma.classification.update({
      where: { id },
      data: {
        code,
        shortCode,
        description
      }
    })

    return NextResponse.json(classification)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar classificação" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID da classificação é obrigatório" }, { status: 400 })
    }

    await prisma.classification.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Classificação excluída com sucesso" })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir classificação" }, { status: 500 })
  }
}