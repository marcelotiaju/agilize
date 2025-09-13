import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { getServerSession } from "next-auth"
import { nextAuthOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    console.log('API: Buscando usuários...')
    const session = await getServerSession(nextAuthOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // if (!session.user.canEdit) {
  //   return NextResponse.json({ error: "Sem permissão para visualizar usuário" }, { status: 403 })
  // }
    
    const users = await prisma.user.findMany({
      include: {
        congregations: {
          include: {
            congregation: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Transformar os dados para o formato esperado pela interface
    const transformedUsers = users.map(user => ({
      ...user,
      congregations: user.congregations.map(uc => uc.congregation)
    }))

    console.log('API: Usuários encontrados:', transformedUsers.length)
    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('API: Erro ao buscar usuários:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, cpf, phone, password, validFrom, validTo, historyDays, canExport, 
      canDelete,
      canLaunchEntry,
      canLaunchTithe,
      canLaunchExpense,
      canApproveEntry,
      canApproveTithe,
      canApproveExpense,
      canCreate,
      canEdit,
      canExclude
     } = await request.json()

    // Validações básicas
    if (!email || !cpf || !password) {
      return NextResponse.json({ error: "Email, CPF e senha são obrigatórios" }, { status: 400 })
    }

    // Verificar se email já existe
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })
    if (existingEmail) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
    }

    // Verificar se CPF já existe
    const existingCpf = await prisma.user.findUnique({
      where: { cpf }
    })
    if (existingCpf) {
      return NextResponse.json({ error: "CPF já cadastrado" }, { status: 400 })
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        cpf,
        phone,
        password: hashedPassword,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        historyDays: parseInt(historyDays),
        canExport: canExport || false,
        canDelete: canDelete || false,
        canLaunchEntry: canLaunchEntry || false,
        canLaunchTithe: canLaunchTithe || false,
        canLaunchExpense: canLaunchExpense || false,
        canApproveEntry: canApproveEntry || false,
        canApproveTithe: canApproveTithe || false,
        canApproveExpense: canApproveExpense || false,
        canCreate: canCreate || false,
        canEdit: canEdit || false,
        canExclude: canExclude || false
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, email, cpf, phone, password, validFrom, validTo, historyDays, canExport, canDelete,
      canLaunchEntry,
      canLaunchTithe,
      canLaunchExpense,
      canApproveEntry,
      canApproveTithe,
      canApproveExpense,
      canCreate,
      canEdit,
      canExclude
     } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    if (!existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se email já existe em outro usuário
    if (email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })
      if (existingEmail) {
        return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
      }
    }

    // Verificar se CPF já existe em outro usuário
    if (cpf !== existingUser.cpf) {
      const existingCpf = await prisma.user.findUnique({
        where: { cpf }
      })
      if (existingCpf) {
        return NextResponse.json({ error: "CPF já cadastrado" }, { status: 400 })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        cpf,
        phone,
        password: password ? await bcrypt.hash(password, 12) : existingUser.password,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        historyDays: parseInt(historyDays),
        canExport: canExport || false,
        canDelete: canDelete || false,
        canLaunchEntry: canLaunchEntry || false,
        canLaunchTithe: canLaunchTithe || false,
        canLaunchExpense: canLaunchExpense || false,
        canApproveEntry: canApproveEntry || false,
        canApproveTithe: canApproveTithe || false,
        canApproveExpense: canApproveExpense || false,
        canCreate: canCreate || false,
        canEdit: canEdit || false,
        canExclude: canExclude || false
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    if (!existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Excluir usuário (as relações serão excluídas automaticamente devido ao cascade)
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Usuário excluído com sucesso" })
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
