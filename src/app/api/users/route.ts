import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('API /api/users - session:', !!session, session?.user?.email ?? session?.user?.login ?? null)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const users = await prisma.user.findMany({
      include: {
        congregations: {
          include: {
            congregation: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        profile: true
      }
    })

    const transformedUsers = users.map(user => {
      // resolvemos permissões: sempre priorizar as do profile (quando existir),
      // caso não exista profile, retornar permissões padrão (false)
      const profile = user.profile
      const resolvedPermissions = {
        canExport: !!profile?.canExport,
        canDelete: !!profile?.canDelete,
        canLaunchVote: !!profile?.canLaunchVote,
        canLaunchEbd: !!profile?.canLaunchEbd,
        canLaunchCampaign: !!profile?.canLaunchCampaign,
        canLaunchTithe: !!profile?.canLaunchTithe,
        canLaunchExpense: !!profile?.canLaunchExpense,
        canLaunchMission: !!profile?.canLaunchMission,
        canLaunchCircle: !!profile?.canLaunchCircle,
        canLaunchServiceOffer: !!profile?.canLaunchServiceOffer,
        canApproveVote: !!profile?.canApproveVote,
        canApproveEbd: !!profile?.canApproveEbd,
        canApproveCampaign: !!profile?.canApproveCampaign,
        canApproveTithe: !!profile?.canApproveTithe,
        canApproveExpense: !!profile?.canApproveExpense,
        canApproveMission: !!profile?.canApproveMission,
        canApproveCircle: !!profile?.canApproveCircle,
        canApproveServiceOffer: !!profile?.canApproveServiceOffer,
        canCreate: !!profile?.canCreate,
        canEdit: !!profile?.canEdit,
        canExclude: !!profile?.canExclude,
        canManageSummary: !!profile?.canManageSummary,
        canApproveTreasury: !!profile?.canApproveTreasury,
        canApproveAccountant: !!profile?.canApproveAccountant,
        canApproveDirector: !!profile?.canApproveDirector,
        canManageUsers: !!profile?.canManageUsers
      }

      return {
        id: user.id,
        login: user.login ?? null,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        validFrom: user.validFrom,
        validTo: user.validTo,
        historyDays: user.historyDays,
        defaultPage: user.defaultPage ?? '/dashboard',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        congregations: user.congregations.map(uc => uc.congregation),
        profile: user.profile ? { id: user.profile.id, name: user.profile.name } : null,
        // permissões resolvidas a partir do profile
        ...resolvedPermissions
      }
    })

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('API: Erro ao buscar usuários:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const {
      login, name, email, cpf, phone, password, validFrom, validTo, historyDays,
      profileId, defaultPage
    } = payload

    if (!email || !cpf || !password) {
      return NextResponse.json({ error: "Email, CPF e senha são obrigatórios" }, { status: 400 })
    }

    // Unicidades
    const existingLogin = login ? await prisma.user.findUnique({ where: { login } }) : null
    if (existingLogin) return NextResponse.json({ error: "Login já cadastrado" }, { status: 400 })

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })

    const existingCpf = await prisma.user.findUnique({ where: { cpf } })
    if (existingCpf) return NextResponse.json({ error: "CPF já cadastrado" }, { status: 400 })

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        login,
        name,
        email,
        cpf,
        phone,
        password: hashedPassword,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        historyDays: parseInt(historyDays || '30'),
        profile: profileId ? { connect: { id: profileId } } : undefined,
        defaultPage: defaultPage || '/dashboard'
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
    const payload = await request.json()
    const {
      id, login, name, email, cpf, phone, password, validFrom, validTo, historyDays,
      profileId, defaultPage
    } = payload

    if (!id) return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })

    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

    if (login && login !== existingUser.login) {
      const existingLogin = await prisma.user.findUnique({ where: { login } })
      if (existingLogin) return NextResponse.json({ error: "Login já cadastrado" }, { status: 400 })
    }

    if (email && email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } })
      if (existingEmail) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
    }

    if (cpf && cpf !== existingUser.cpf) {
      const existingCpf = await prisma.user.findUnique({ where: { cpf } })
      if (existingCpf) return NextResponse.json({ error: "CPF já cadastrado" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        login,
        name,
        email,
        cpf,
        phone,
        password: password ? await bcrypt.hash(password, 12) : existingUser.password,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        historyDays: parseInt(historyDays || `${existingUser.historyDays}`),
        profile: typeof profileId === 'string' && profileId.trim() !== '' ? { connect: { id: profileId } } : { disconnect: true },
        defaultPage: defaultPage || '/dashboard'
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })

    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: "Usuário excluído com sucesso" })
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
