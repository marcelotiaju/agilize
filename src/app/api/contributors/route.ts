import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getDb } from "@/lib/getDb"
import { authOptions } from "../auth/[...nextauth]/route"
import path from 'path'
import fs from 'fs'

const UPLOADS_FOLDER = "public/uploads"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const { searchParams } = new URL(request.url)
    const congregationId = searchParams.get('congregationId')
    const filterByUserCongregations = searchParams.get('filterByUserCongregations') !== 'false'
    const activeOnly = searchParams.get('activeOnly') === 'true'
    let where: any = {}
    
    if (filterByUserCongregations) {
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
    }
    
    if (congregationId) {
      where.congregationId = congregationId
    }

    if (activeOnly) {
      where.isActive = true
    }

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

    const UPLOADS_DIR = path.join(process.cwd(), UPLOADS_FOLDER)
    const contributorsWithPhotos = contributors.map(c => {
      if (!c.photoUrl) {
        return { ...c, photoExists: false }
      }

      // Handle both cases: with or without /uploads/ prefix
      let cleanPath = c.photoUrl.startsWith('/api') ? c.photoUrl.replace('/api', '') : c.photoUrl;
      if (cleanPath.startsWith('/uploads/')) {
        cleanPath = cleanPath.replace('/uploads/', '');
      } else if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace('uploads/', '');
      } else if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }

      const filePath = path.join(process.cwd(), UPLOADS_FOLDER, cleanPath)
      const fileExists = fs.existsSync(filePath)

      return {
        ...c,
        photoExists: fileExists
      }
    })

    return NextResponse.json(contributorsWithPhotos)
  } catch (error) {
    console.error('API: Erro ao buscar contribuintes:', error)
    return NextResponse.json({ error: "Erro ao buscar contribuintes" }, { status: 500 })
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

    const existingCode = await prisma.contributor.findFirst({
      where: { code }
    })

    if (existingCode) {
      return NextResponse.json({ error: "Já existe um contribuinte com este código" }, { status: 400 })
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
    console.error('API: Erro ao criar contribuinte:', error)
    return NextResponse.json({ error: "Erro ao criar contribuinte" }, { status: 500 })
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
    const { id, name, cpf, ecclesiasticalPosition, tipo, photoUrl } = body

    const contributor = await prisma.contributor.findUnique({
      where: { id }
    })

    if (!contributor) {
      return NextResponse.json({ error: "Contribuinte não encontrado" }, { status: 404 })
    }

    if (body.code && body.code !== contributor.code) {
      const existingCode = await prisma.contributor.findFirst({
        where: { code: body.code }
      })
      if (existingCode) {
        return NextResponse.json({ error: "Já existe um contribuinte com este código" }, { status: 400 })
      }
    }

    const updatedContributor = await prisma.contributor.update({
      where: { id },
      data: { 
        congregationId: body.congregationId,
        code: body.code, 
        name: body.name, 
        cpf: body.cpf, 
        ecclesiasticalPosition: body.ecclesiasticalPosition, 
        tipo: body.tipo, 
        photoUrl 
      }
    })

    return NextResponse.json(updatedContributor)
  } catch (error) {
    console.error('API: Erro ao atualizar contribuinte:', error)
    return NextResponse.json({ error: "Erro ao atualizar contribuinte" }, { status: 500 })
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
      return NextResponse.json({ error: "ID do contribuinte é obrigatório" }, { status: 400 })
    }

    const contributor = await prisma.contributor.findUnique({
      where: { id },
      select: { photoUrl: true }
    });

    if (contributor?.photoUrl) {
      try {
        const filePath = path.join(process.cwd(), UPLOADS_FOLDER, contributor.photoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Erro ao excluir arquivo físico da foto:', err);
      }
    }

    await prisma.contributor.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Contribuinte excluído com sucesso" })
  } catch (error) {
    console.error('API: Erro ao excluir contribuinte:', error)
    return NextResponse.json({ error: "Erro ao excluir contribuinte" }, { status: 500 })
  }
}