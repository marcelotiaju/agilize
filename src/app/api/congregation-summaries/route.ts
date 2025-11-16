import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

// helper: aceita 'yyyy-MM-dd', 'dd/MM/yyyy' ou ISO full e retorna Date UTC instant
function parseDateToUtcInstant(dateStr: string, timezone: string, endOfDayFlag = false): Date {
  if (!dateStr) throw new Error('empty date')
  // yyyy-MM-dd (HTML date input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return zonedTimeToUtc(`${dateStr}T${endOfDayFlag ? '23:59:59.999' : '00:00:00'}`, timezone)
  }
  // dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split('/')
    const iso = `${yyyy}-${mm}-${dd}`
    return zonedTimeToUtc(`${iso}T${endOfDayFlag ? '23:59:59.999' : '00:00:00'}`, timezone)
  }
  // try full ISO / Date parse fallback
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return d
  }
  throw new Error('Invalid date format')
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationIdsString = searchParams.get('congregationIds')
    const startSummaryDate = searchParams.get('startSummaryDate')
    const endSummaryDate = searchParams.get('endSummaryDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    if (!congregationIdsString) {
      return NextResponse.json({ error: "ID da congregação é obrigatório" }, { status: 400 })
    }

    const congregationIds = congregationIdsString.split(',').filter(id => id.trim() !== '');

    if (congregationIds.length === 0) {
       return NextResponse.json({ error: "IDs das congregações são obrigatórios" }, { status: 400 })
    }

    let where: any = {}
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      },
      select: { congregationId: true }
    })

    if (userCongregations.length === 0) {
      return NextResponse.json({ error: "Acesso não autorizado a estas congregações" }, { status: 403 })
    }

    if (startSummaryDate && endSummaryDate) {
      try {
        const startUtc = parseDateToUtcInstant(startSummaryDate, timezone, false)
        const endUtc = parseDateToUtcInstant(endSummaryDate, timezone, true)

        where.startDate = { gte: startUtc, lte: endUtc }
        where.endDate = { gte: startUtc, lte: endUtc }
      } catch (err) {
        return NextResponse.json({ error: 'Formato de data inválido' }, { status: 400 })
      }
    }

    where.congregationId = { in: congregationIds }

    const summaries = await prisma.congregationSummary.findMany({
      where: { ...where },
      include: { Launch: true, congregation: true },
      orderBy: { startDate: 'desc' }
    })

    // Serializa datas como ISO UTC para o frontend
    const payload = summaries.map(s => ({
      ...s,
      startDate: s.startDate ? new Date(s.startDate).toISOString() : null,
      endDate: s.endDate ? new Date(s.endDate).toISOString() : null,
      date: (s as any).date ? new Date((s as any).date).toISOString() : null,
      Launch: (s.Launch || []).map(l => ({
        ...l,
        date: l.date ? new Date(l.date).toISOString() : null
      }))
    }))

    return NextResponse.json({ summaries: payload })
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

  if (!session.user.canManageSummary) {
    return NextResponse.json({ error: "Sem permissão para gerenciar resumos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { congregationId, startDate, endDate } = body

    if (!congregationId || !startDate || !endDate) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }
    const timezone = body.timezone || 'America/Sao_Paulo'

    let startUtc: Date
    let endUtc: Date
    try {
      startUtc = parseDateToUtcInstant(startDate, timezone, false)
      endUtc = parseDateToUtcInstant(endDate, timezone, true)
    } catch (err) {
      return NextResponse.json({ error: "Formato de data inválido" }, { status: 400 })
    }
    endUtc = new Date(endUtc.getTime() - 3 * 60 * 60 * 1000) // Ajuste de +3 horas
    // Validação "não futura" comparando com fim do dia atual no timezone do usuário
    const nowZoned = utcToZonedTime(new Date(), timezone)
    const todayEndZoned = endOfDay(nowZoned)
    const todayEndUtc = zonedTimeToUtc(todayEndZoned, timezone)

    if (startUtc > todayEndUtc || endUtc > todayEndUtc) {
        return NextResponse.json({ error: "A data do resumo não pode ser futura." }, { status: 400 });
    }

    const userCongregation = await prisma.userCongregation.findFirst({
      where: { userId: session.user.id, congregationId }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    // Buscar lançamentos no período
    const launches = await prisma.launch.findMany({
      where: {
        congregationId,
        date: { gte: startUtc, lte: endUtc },
        status: "NORMAL",
        summaryId: null
      },
      include: { congregation: true },
      orderBy: { date: 'asc' }
    })

    if (launches.length === 0) {
        return NextResponse.json({ error: "Não há lançamentos no período para criar um resumo." }, { status: 400 });
    }

    // Resumo
    const entradaSummary = { dizimo: 0, oferta: 0, votos: 0, campanha: 0, ebd: 0, mission: 0, circle: 0, total: 0 }
    const saidaSummary = { saida: 0, total: 0 }
    const approvalSummary = { pending: 0, approved: { treasury: 0, accountant: 0, director: 0, total: 0 } }

    launches.forEach(launch => {
      if (launch.type === "ENTRADA") {
        entradaSummary.dizimo += launch.value || 0
        entradaSummary.votos += launch.votesValue || 0
        entradaSummary.campanha += launch.campaignValue || 0
        entradaSummary.ebd += launch.ebdValue || 0
        entradaSummary.total += (launch.value || 0) + (launch.votesValue || 0) + (launch.campaignValue || 0) + (launch.ebdValue || 0)
      } else if (launch.type === "DIZIMO") {
        entradaSummary.dizimo += launch.value || 0
      } else if (launch.type === "MISSAO") {
        entradaSummary.mission += launch.value || 0
      } else if (launch.type === "CIRCULO") {
        entradaSummary.circle += launch.value || 0
      } else if (launch.type === "OFERTA_CULTO") {
        entradaSummary.oferta += launch.offerValue || 0
      } else if (launch.type === "SAIDA") {
        saidaSummary.saida += launch.value || 0
        saidaSummary.total += launch.value || 0
      }
    })

    const existingSummary = await prisma.congregationSummary.findFirst({
      where: { congregationId, startDate: startUtc, endDate: endUtc }
    })

    if (existingSummary) {
      return NextResponse.json({ error: "Já existe um resumo para este período" }, { status: 400 })
    }
console.log(endUtc)
    const summary = await prisma.congregationSummary.create({
      data: {
        congregationId,
        startDate: startUtc,
        endDate: endUtc,
        launchCount: launches.length,
        entryCount: entradaSummary.total,
        exitCount: saidaSummary.total,
        entryTotal: entradaSummary.total,
        missionTotal: entradaSummary.mission,
        circleTotal: entradaSummary.circle,
        titheTotal: entradaSummary.dizimo,
        exitTotal: saidaSummary.total,
        offerTotal: entradaSummary.oferta,
        votesTotal: entradaSummary.votos,
        ebdTotal: entradaSummary.ebd,
        campaignTotal: entradaSummary.campanha,
        depositValue: 0,
        cashValue: 0,
        talonNumber: '',
        treasurerApproved: false,
        accountantApproved: false,
        directorApproved: false,
        totalValue: entradaSummary.total - saidaSummary.total,
        titheValue: entradaSummary.dizimo,
        offerValue: entradaSummary.oferta,
        votesValue: entradaSummary.votos,
        ebdValue: entradaSummary.ebd,
        campaignValue: entradaSummary.campanha,
        missionValue: entradaSummary.mission,
        circleValue: entradaSummary.circle,
        exitValue: saidaSummary.saida,
        status: "PENDING"
      }
    })

    await prisma.launch.updateMany({
        where: {
            congregationId: summary.congregationId,
            date: { gte: startUtc, lte: endUtc },
            summaryId: null,
            status: 'NORMAL',
        },
        data: { summaryId: summary.id },
    });

    return NextResponse.json({
      entradaSummary,
      saidaSummary,
      approvalSummary,
      launches: launches.map(l => ({ ...l, date: l.date ? new Date(l.date).toISOString() : null })),
      summary: { ...summary, startDate: summary.startDate.toISOString(), endDate: summary.endDate.toISOString() },
      period: { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() }
    })
  } catch (error) {
    console.error("Erro ao criar resumo:", error)
    return NextResponse.json({ error: "Erro ao criar resumo" }, { status: 500 })
  }
}

// ...existing code for PUT/DELETE remains unchanged...

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      id, 
      depositValue, 
      cashValue, 
      talonNumber,
      treasurerApproved, 
      accountantApproved, 
      directorApproved,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "ID do resumo é obrigatório para atualização" }, { status: 400 })
    }
    
    //console.log('Atualizando resumo:', body)
    const summary = await prisma.congregationSummary.findUnique({
      where: { id },
      include: { Launch: true }
    })

    if (!summary) {
      return NextResponse.json({ error: "Resumo não encontrado" }, { status: 404 })
    }

    // Verificar se o usuário tem acesso à congregação
    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId: summary.congregationId
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    // Verificar permissões para aprovação
    if (treasurerApproved && !session.user.canApproveTreasury) {
      return NextResponse.json({ error: "Sem permissão para aprovar como tesoureiro" }, { status: 403 })
    }
    if (accountantApproved && !session.user.canApproveAccountant) {
      return NextResponse.json({ error: "Sem permissão para aprovar como contador" }, { status: 403 })
    }
    if (directorApproved && !session.user.canApproveDirector) {
      return NextResponse.json({ error: "Sem permissão para aprovar como dirigente" }, { status: 403 })
    }

    if(directorApproved) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          status: "APPROVED"
        }
      })
    }

    const updatedSummary = await prisma.congregationSummary.update({
      where: { id },
      data: {
        depositValue: depositValue !== undefined ? parseFloat(depositValue) : summary.depositValue,
        cashValue: cashValue !== undefined ? parseFloat(cashValue) : summary.cashValue,
        talonNumber: talonNumber !== undefined ? talonNumber : summary.talonNumber,
        treasurerApproved: treasurerApproved,
        accountantApproved: accountantApproved,
        directorApproved: directorApproved,
        status: directorApproved ? "APPROVED" : "PENDING",
        updatedAt: new Date()}
    })
    //console.log("Resumo atualizado:", updatedSummary)
    return NextResponse.json(updatedSummary, { status: 200 })
  } catch (error) {
    console.error("Erro ao atualizar resumo:", error)
    return NextResponse.json({ error: "Erro ao atualizar resumo" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canManageSummary) {
    return NextResponse.json({ error: "Sem permissão para excluir resumos" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID do resumo é obrigatório" }, { status: 400 })
    }

    const summary = await prisma.congregationSummary.findUnique({
      where: { id }
    })

    if (!summary) {
      return NextResponse.json({ error: "Resumo não encontrado" }, { status: 404 })
    }

    // Verificar se o usuário tem acesso à congregação
    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId: summary.congregationId
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    await prisma.congregationSummary.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Resumo excluído com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir resumo:", error)
    return NextResponse.json({ error: "Erro ao excluir resumo" }, { status: 500 })
  }
}