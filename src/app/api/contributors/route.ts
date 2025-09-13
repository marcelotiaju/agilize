import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { nextAuthOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationCode = searchParams.get('congregationCode')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let where: any = {}
    
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        congregationId: true
      }
    })

    where.congregationId = {
      in: userCongregations.map(uc => uc.congregationId)
    }

    if (congregationCode) {
      where.congregationCode = congregationCode
    }

    // if (startDate && endDate) {
    //   where.date = {
    //     gte: new Date(startDate as string),
    //     lte: new Date(endDate as string)
    //   }
    // }

    const contributors = await prisma.contributor.findMany({
      where,
      include: {
        congregation: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
    })

    return NextResponse.json(contributors)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar contribuintes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      congregationCode,
      code,
      name,
      cpf,
      ecclesiasticalPosition,
      type
    } = body

    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId: congregationCode
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    // const contributorDate = new Date(date)
    // const today = new Date()
    // today.setHours(0, 0, 0, 0)

    // if (contributorDate > today) {
    //   return NextResponse.json({ error: "Não é permitido lançar com data futura" }, { status: 400 })
    // }

    const existingContributor = await prisma.contributor.findFirst({
      where: {
        congregationCode,
        code,
        name,
        cpf,
        ecclesiasticalPosition,
        tipo: type
      }
    })

    if (existingContributor) {
      return NextResponse.json({ error: "Já existe um contribuinte com estes dados" }, { status: 400 })
    }

    const contributor = await prisma.contributor.create({
      data: {
        congregationCode,
        code,
        name,
        cpf,
        ecclesiasticalPosition,
        tipo: type
      }
    })

    return NextResponse.json(contributor, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar contribuinte" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { id,name,cpf,ecclesiasticalPosition } = body

    const contributor = await prisma.contributor.findUnique({
      where: { id }
    })

    if (!contributor) {
      return NextResponse.json({ error: "Contribuinte não encontrado" }, { status: 404 })
    }

    // const userCongregation = await prisma.userCongregation.findFirst({
    //   where: {
    //     userId: session.user.id,
    //     congregationId: contributor.congregationId
    //   }
    // })

    // if (!userCongregation) {
    //   return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    // }

    // if (contributor.exported) {
    //   return NextResponse.json({ error: "Contribuinte já exportado não pode ser alterado" }, { status: 400 })
    // }

    // if (contributor.status === "CANCELED" && status === "NORMAL") {
    //   return NextResponse.json({ error: "Não é possível reverter um contribuinte cancelado" }, { status: 400 })
    // }

    const updatedContributor = await prisma.contributor.update({
      where: { id },
      data: { code: body.code, name: body.name, cpf: body.cpf, ecclesiasticalPosition: body.ecclesiasticalPosition, tipo: body.tipo }
    })

    return NextResponse.json(updatedContributor)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar contribuinte" }, { status: 500 })
  }
}