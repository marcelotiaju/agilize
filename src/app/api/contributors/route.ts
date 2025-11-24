import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";
import Congregations from "@/app/congregations/page";
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationId = searchParams.get('congregationId')
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

    if (congregationId) {
      where.congregationId = congregationId
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

    // Caminho absoluto para o diretório de uploads
    const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');
console.log('Uploads Dir:', UPLOADS_DIR);
    const contributorsWithPhotos = contributors.map(c => {
      if (!c.photoUrl) {
        return { ...c, photoExists: false };
      }
      
      const fileName = c.photoUrl;
      const filePath = path.join(UPLOADS_DIR, fileName);
      const fileExists = fs.existsSync(filePath);

      return {
            ...c,
            photoExists: fileExists
          };
    });

    return NextResponse.json(contributorsWithPhotos)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar contribuintes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      congregationId,
      code,
      name,
      cpf,
      ecclesiasticalPosition,
      type,
      photoUrl 
    } = body

    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId
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
        congregationId,
        code,
        name,
        cpf,
        ecclesiasticalPosition,
        tipo: type,
        photoUrl 
      }
    })

    if (existingContributor) {
      return NextResponse.json({ error: "Já existe um contribuinte com estes dados" }, { status: 400 })
    }

    const contributor = await prisma.contributor.create({
      data: {
        congregationId,
        code,
        name,
        cpf,
        ecclesiasticalPosition,
        tipo: type,
        photoUrl 
      }
    })

    return NextResponse.json(contributor, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar contribuinte" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { id,name,cpf,ecclesiasticalPosition,tipo,photoUrl } = body

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
      data: { code: body.code, name: body.name, cpf: body.cpf, ecclesiasticalPosition: body.ecclesiasticalPosition, tipo: body.tipo, photoUrl }
    })

    return NextResponse.json(updatedContributor)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar contribuinte" }, { status: 500 })
  }
}