import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
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
    // aceitar tanto "congregationIds=1,2,3" quanto múltiplos "congregationId=1&congregationId=2"
    const congregationIdsString = searchParams.get('congregationIds')
    const startSummaryDate = searchParams.get('startSummaryDate')
    const endSummaryDate = searchParams.get('endSummaryDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    let congregationIds: string[] = []
    if (congregationIdsString && congregationIdsString.trim() !== '') {
      congregationIds = congregationIdsString.split(',').map(s => s.trim()).filter(Boolean)
    }

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

    // restringir àquelas congregações que o usuário realmente tem acesso
    const allowedIds = userCongregations.map(c => c.congregationId)
    const filteredIds = congregationIds.filter(id => allowedIds.includes(id))
    if (filteredIds.length === 0) {
      return NextResponse.json({ error: "Nenhuma das congregações selecionadas está autorizada para o usuário" }, { status: 403 })
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

    where.congregationId = { in: filteredIds }

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

  if (!session.user.canGenerateSummary) {
    return NextResponse.json({ error: "Sem permissão para gerar resumos" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { congregationId, startDate, endDate, summaryType } = body

    if (!congregationId || !startDate || !endDate || !summaryType) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }
    const timezone = body.timezone || 'America/Sao_Paulo'

    // Determinar tipos de lançamento baseado no tipo de resumo
    let allowedTypes: string[] = []
    switch (summaryType) {
      case 'PADRAO':
        allowedTypes = ['DIZIMO', 'OFERTA_CULTO', 'VOTO', 'EBD', 'CAMPANHA','MISSAO']
        break
      // case 'MISSAO':
      //   allowedTypes = ['MISSAO']
      //   break
      case 'CARNE_REVIVER':
        allowedTypes = ['CARNE_REVIVER']
        break
      case 'CIRCULO':
        allowedTypes = ['CIRCULO']
        break
      default:
        return NextResponse.json({ error: "Tipo de resumo inválido" }, { status: 400 })
    }

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

    // Buscar lançamentos no período filtrados pelo tipo de resumo
    // Excluir lançamentos importados (IMPORTED) - eles não devem somar nos resumos
    const launches = await prisma.launch.findMany({
      where: {
        congregationId,
        date: { gte: startUtc, lte: endUtc },
        type: { in: allowedTypes },
        status: { in: ["NORMAL", "APPROVED"], not: "IMPORTED" },
        summaryId: null
      },
      include: { congregation: true },
      orderBy: { date: 'asc' }
    })

    if (launches.length === 0) {
        const typeLabel = summaryType === 'PADRAO' ? 'Padrão' : 
                        //  summaryType === 'MISSAO' ? 'Missão' :
                         summaryType === 'CARNE_REVIVER' ? 'Carnê Reviver' :
                         summaryType === 'CIRCULO' ? 'Círculo de Oração' : 'selecionado'
        return NextResponse.json({ error: `Não há lançamentos do tipo ${typeLabel} no período para criar um resumo.` }, { status: 400 });
    }

    // Resumo
    const entradaSummary = { dizimo: 0, oferta: 0, votos: 0, campanha: 0, ebd: 0, mission: 0, circle: 0, carneReviver: 0, total: 0 }
    const saidaSummary = { saida: 0, total: 0 }
    const approvalSummary = { pending: 0, approved: { treasury: 0, accountant: 0, director: 0, total: 0 } }

    launches.forEach(launch => {
      if (launch.type === "VOTO") {
        entradaSummary.votos += launch.value || 0
      } else if (launch.type === "OFERTA_CULTO") {
        entradaSummary.oferta += launch.value || 0
      } else if (launch.type === "CAMPANHA") {
        entradaSummary.campanha += launch.value || 0
      } else if (launch.type === "EBD") {
        entradaSummary.ebd += launch.value || 0
      } else if (launch.type === "DIZIMO") {
        entradaSummary.dizimo += launch.value || 0
      } else if (launch.type === "MISSAO") {
        entradaSummary.mission += launch.value || 0
      } else if (launch.type === "CIRCULO") {
        entradaSummary.circle += launch.value || 0
      } else if (launch.type === "CARNE_REVIVER") {
        entradaSummary.carneReviver += launch.value || 0
      } else if (launch.type === "SAIDA") {
        saidaSummary.saida += launch.value || 0
        saidaSummary.total += launch.value || 0
      }
    })
//console.log('Entrada Summary:', entradaSummary)
    // Verificar se já existe resumo para este período e tipo
    const existingSummary = await prisma.congregationSummary.findFirst({
      where: { 
        congregationId, 
        startDate: startUtc, 
        endDate: endUtc,
        // Adicionar campo summaryType no schema se necessário, por enquanto verificar apenas período
      }
    })

    if (existingSummary) {
      return NextResponse.json({ error: "Já existe um resumo para este período" }, { status: 400 })
    }
    // Calcular total de entradas baseado no tipo de resumo
    let totalEntradas = 0
    if (summaryType === 'PADRAO') {
      totalEntradas = entradaSummary.dizimo + entradaSummary.oferta + entradaSummary.votos + entradaSummary.ebd + entradaSummary.campanha + entradaSummary.mission
    // } else if (summaryType === 'MISSAO') {
    //   totalEntradas = entradaSummary.mission
    } else if (summaryType === 'CARNE_REVIVER') {
      totalEntradas = entradaSummary.carneReviver
    } else if (summaryType === 'CIRCULO') {
      totalEntradas = entradaSummary.circle
    }

    const summary = await prisma.congregationSummary.create({
      data: {
        congregationId,
        startDate: startUtc,
        endDate: endUtc,
        launchCount: launches.length,
        entryTotal: totalEntradas,
        missionTotal: entradaSummary.mission,
        circleTotal: entradaSummary.circle,
        carneReviverTotal: entradaSummary.carneReviver,
        titheTotal: entradaSummary.dizimo,
        offerTotal: entradaSummary.oferta,
        votesTotal: entradaSummary.votos,
        ebdTotal: entradaSummary.ebd,
        campaignTotal: entradaSummary.campanha,
        exitTotal: saidaSummary.total,
        depositValue: 0,
        cashValue: 0,
        talonNumber: '',
        summaryType: summaryType,
        treasurerApproved: false,
        accountantApproved: false,
        directorApproved: false,
        totalValue: totalEntradas - saidaSummary.total,
        status: "PENDING",
        createdBy: session.user.name
      }
    })

    await prisma.launch.updateMany({
        where: {
            congregationId: summary.congregationId,
            date: { gte: startUtc, lte: endUtc },
            summaryId: null,
            status:  { in: ["NORMAL", "APPROVED"] },
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
    // if (treasurerApproved && !session.user.canApproveTreasury) {
    //   return NextResponse.json({ error: "Sem permissão para aprovar como tesoureiro" }, { status: 403 })
    // }
    // if (accountantApproved && !session.user.canApproveAccountant) {
    //   return NextResponse.json({ error: "Sem permissão para aprovar como contador" }, { status: 403 })
    // }
    // if (directorApproved && !session.user.canApproveDirector) {
    //   return NextResponse.json({ error: "Sem permissão para aprovar como dirigente" }, { status: 403 })
    // }

    let approvedByTreasury = null
    let approvedAtTreasury = null
    let approvedByAccountant = null
    let approvedAtAccountant = null
    let approvedByDirector = null
    let approvedAtDirector = null

    if (treasurerApproved && session.user.canApproveTreasury) {
          approvedByTreasury = session.user?.name
          approvedAtTreasury = new Date()
    }
    if (accountantApproved && session.user.canApproveAccountant) {
          approvedByAccountant = session.user?.name
          approvedAtAccountant = new Date()
    }
    if (directorApproved && session.user.canApproveDirector) {
          approvedByDirector = session.user?.name
          approvedAtDirector = new Date()
    }

    if(treasurerApproved && session.user.canApproveTreasury) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          approvedByTreasury: approvedByTreasury || null,
          approvedAtTreasury: approvedAtTreasury || null,
        }
      })
    } 

    if(!treasurerApproved && session.user.canApproveTreasury) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          approvedByTreasury: null,
          approvedAtTreasury: null,
        }
      })
    } 

    if(accountantApproved && session.user.canApproveAccountant) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          approvedByAccountant: approvedByAccountant || null,
          approvedAtAccountant: approvedAtAccountant || null,
        }
      })
    } 
    
      if(!accountantApproved && session.user.canApproveAccountant) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          approvedByAccountant: null,
          approvedAtAccountant: null,
        }
      })
    } 

    if(directorApproved && session.user.canApproveDirector) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          status: "APPROVED",
          approvedByDirector: approvedByDirector || null,
          approvedAtDirector: approvedAtDirector || null,
          approvedVia: 'SUMMARY'
        }
      })
    } 
    
    if(!directorApproved && session.user.canApproveDirector) {
      await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "APPROVED"
        },
        data: {
          status: "NORMAL",
          approvedByDirector: null,
          approvedAtDirector: null,
          approvedVia: null
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
        updatedAt: new Date(),
        approvedByTreasury: body.approvedByTreasury || null,
        approvedAtTreasury: body.approvedAtTreasury || null,
        approvedByAccountant: body.approvedByAccountant || null,
        approvedAtAccountant: body.approvedAtAccountant || null,
        approvedByDirector: body.approvedByDirector || null,
        approvedAtDirector: body.approvedAtDirector || null
      }
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

  if (!session.user.canGenerateSummary) {
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

    await prisma.launch.updateMany({
        where: {
          summaryId: id,
          status: "NORMAL"
        },
        data: {
          //status: "NORMAL",
          approvedByTreasury: null,
          approvedAtTreasury: null,
          approvedByAccountant: null,
          approvedAtAccountant: null,
          approvedByDirector: null,
          approvedAtDirector: null
        }
      })

    await prisma.congregationSummary.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Resumo excluído com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir resumo:", error)
    return NextResponse.json({ error: "Erro ao excluir resumo" }, { status: 500 })
  }
}