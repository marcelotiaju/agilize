import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cpf,
      name,
      email,
      phone,
      password,
      validFrom,
      validTo,
      historyDays,
      canExport,
      canDelete,
      // Novas permissões
      canLaunchEntry,
      canLaunchTithe,
      canLaunchExpense,
      canApproveEntry,
      canApproveTithe,
      canApproveExpense,
      canCreate,
      canEdit,
      canExclude
    } = body

    // Verificar se o CPF já está em uso
    const existingUserByCpf = await prisma.user.findUnique({
      where: { cpf }
    })

    if (existingUserByCpf) {
      return NextResponse.json({ error: "CPF já cadastrado" }, { status: 400 })
    }

    // Verificar se o email já está em uso
    if (email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUserByEmail) {
        return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        cpf,
        name,
        email,
        phone,
        password: hashedPassword,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        historyDays: parseInt(historyDays) || 30,
        canExport: canExport || false,
        canDelete: canDelete || false,
        // Novas permissões
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

    // Remover a senha do objeto de retorno
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Erro ao registrar usuário:", error)
    return NextResponse.json({ error: "Erro ao registrar usuário" }, { status: 500 })
  }
}