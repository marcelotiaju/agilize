// app/api/congregation-summary/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canManageSummary) {
    return NextResponse.json({ error: "Sem permissão para gerenciar resumos" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationId = searchParams.get('congregationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const summaryDate = searchParams.get('date')

    if (!congregationId || !startDate || !endDate ) {
      return NextResponse.json({ error: "Parâmetros obrigatórios não fornecidos" }, { status: 400 })
    }

    const summaryDateStart = new Date(`${startDate}T12:00:00Z`)
    const summaryDateEnd = new Date(`${endDate}T12:00:00Z`)
    summaryDateStart.setHours(0, 0, 0, 0)
    summaryDateEnd.setHours(0, 0, 0, 0)

    // Buscar resumos existentes
    const summaries = await prisma.congregationSummary.findMany({
      where: {
        congregationId,
        date: {
          gte: summaryDateStart,
          lte: summaryDateEnd
        },
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(summaries)
  } catch (error) {
    console.error("Erro ao buscar resumos:", error)
    return NextResponse.json({ error: "Erro ao buscar resumos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // Verificar se o usuário tem permissão para gerenciar resumo
  if (!session.user.canManageSummary) {
    return NextResponse.json({ error: "Sem permissão para gerenciar resumo" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { congregationId, startDate, endDate, date } = body

    const launchDateStart = new Date(`${body.startDate}T12:00:00Z`)
    const launchDateEnd = new Date(`${body.endDate}T12:00:00Z`)
    const summaryDate = new Date(`${body.date}T12:00:00Z`)
    launchDateStart.setHours(0, 0, 0, 0)
    launchDateEnd.setHours(0, 0, 0, 0)
    summaryDate.setHours(0, 0, 0, 0)

    if (!congregationId || !launchDateStart || !launchDateEnd || !summaryDate) {
      return NextResponse.json({ error: "ID da congregação, data inicial e data final são obrigatórios" }, { status: 400 })
    }

    // Verificar se o usuário tem acesso a esta congregação
    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    // Buscar lançamentos no período
    const launches = await prisma.launch.findMany({
      where: {
        congregationId,
        date: {
          gte: launchDateStart,
          lte: launchDateEnd
        },
        status: "NORMAL"
      },
      include: {
        congregation: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Calcular totais
    const summary = {
      entryCount: launches.filter(l => l.type === "ENTRADA").length,
      exitCount: launches.filter(l => l.type === "SAIDA").length,
      titheValue: launches
        .filter(l => l.type === "DIZIMO")
        .reduce((sum, l) => sum + (l.value || 0), 0),
      offerValue: launches
        .filter(l => l.type === "ENTRADA")
        .reduce((sum, l) => sum + (l.offerValue || 0), 0),
      votesValue: launches
        .filter(l => l.type === "ENTRADA")
        .reduce((sum, l) => sum + (l.votesValue || 0), 0),
      campaignValue: launches
        .filter(l => l.type === "ENTRADA")
        .reduce((sum, l) => sum + (l.campaignValue || 0), 0),
      ebdValue: launches
        .filter(l => l.type === "ENTRADA")
        .reduce((sum, l) => sum + (l.ebdValue || 0), 0),
      exitValue: launches
        .filter(l => l.type === "SAIDA")
        .reduce((sum, l) => sum + (l.value || 0), 0),
      depositValue: 0, // Será preenchido manualmente
      cashValue: 0,     // Será preenchido manualmente
      totalValue: 0     // Será preenchido manualmente
    }

    // Criar o resumo
    const newSummary = await prisma.congregationSummary.create({
      data: {
        congregationId,
        date: summaryDate,
        ...summary
      }
    })

    return NextResponse.json(newSummary, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar resumo:", error)
    return NextResponse.json({ error: "Erro ao criar resumo" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canManageSummary) {
    return NextResponse.json({ error: "Sem permissão para gerenciar resumos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, depositValue, cashValue, totalValue, 
          treasurerApproved, accountantApproved, directorApproved } = body

    if (!id) {
      return NextResponse.json({ error: "ID do resumo é obrigatório" }, { status: 400 })
    }

    // Atualizar o resumo
    const updatedSummary = await prisma.congregationSummary.update({
      where: { id },
      data: {
        depositValue: parseFloat(depositValue) || 0,
        cashValue: parseFloat(cashValue) || 0,
        totalValue: parseFloat(totalValue) || 0,
        treasurerApproved,
        accountantApproved,
        directorApproved
      }
    })

    return NextResponse.json(updatedSummary)
  } catch (error) {
    console.error("Erro ao atualizar resumo:", error)
    return NextResponse.json({ error: "Erro ao atualizar resumo" }, { status: 500 })
  }
}