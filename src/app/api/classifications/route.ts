import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions }  from "../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    
    const classifications = await prisma.classification.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: {
        description: 'asc'
      }
    })

    return NextResponse.json(classifications)
  } catch (error) {
    console.error('API: Erro ao buscar classificações:', error)
    return NextResponse.json({ error: "Erro ao buscar classificações" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const body = await request.json()
    const { code, shortCode, description } = body

    if (!code || !shortCode || !description) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

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
    console.error('API: Erro ao criar classificação:', error)
    return NextResponse.json({ error: "Erro ao criar classificação" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const body = await request.json()
    const { id, code, shortCode, description, isActive } = body

    if (!id || !code || !shortCode || !description) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

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
        description,
        isActive
      }
    })

    return NextResponse.json(classification)
  } catch (error) {
    console.error('API: Erro ao atualizar classificação:', error)
    return NextResponse.json({ error: "Erro ao atualizar classificação" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

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
    console.error('API: Erro ao excluir classificação:', error)
    return NextResponse.json({ error: "Erro ao excluir classificação" }, { status: 500 })
  }
}