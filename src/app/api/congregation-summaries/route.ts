import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationIdsString = searchParams.get('congregationIds') 

    if (!congregationIdsString) {
      return NextResponse.json({ error: "ID da congregação é obrigatório" }, { status: 400 })
    }

    // Converte a string 'id1,id2,id3' em um array ['id1', 'id2', 'id3']
    const congregationIds = congregationIdsString.split(',').filter(id => id.trim() !== '');

    if (congregationIds.length === 0) {
       return NextResponse.json({ error: "IDs das congregações são obrigatórios" }, { status: 400 })
    }

    const summaryDateStart = new Date(`${searchParams.get('startDate')}T12:00:00Z`)
    summaryDateStart.setHours(0, 0, 0, 0)

    const summaryDateEnd = new Date(`${searchParams.get('endDate')}T12:00:00Z`)
    summaryDateEnd.setHours(0, 0, 0, 0)

    const summaryId = searchParams.get('summaryId')
 

    // Verificar se o usuário tem acesso à congregação
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: {
          in: congregationIds // Verifica se o usuário tem acesso a qualquer uma das congregações na lista
        }
      }
    })

    if (userCongregations.length === 0) {
      return NextResponse.json({ error: "Acesso não autorizado a estas congregações" }, { status: 403 })
    }

    const summaries = await prisma.congregationSummary.findMany({
      where: {
        id: summaryId || undefined, // Se summaryId existe, filtra por ID, senão ignora
        congregationId: {
          in: congregationIds // Filtra por qualquer ID dentro da lista
        },
        // startDate: summaryId ? undefined : summaryDateStart, // Filtra por data apenas se não for buscar um único resumo por ID
        // endDate: summaryId ? undefined : summaryDateEnd
      },
      include: {
        // Incluir relacionamentos necessários (como lançamentos, se necessário)
        Launch: true, // Ou o nome correto do relacionamento que traz os lançamentos
        congregation: true // Para poder mostrar o nome da congregação
      },
      orderBy: {
        startDate: 'desc'
      }
    })
console.log('Resumos encontrados:', summaries)
    return NextResponse.json({summaries})
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

    const summaryDateStart = new Date(`${body.startDate}T12:00:00Z`)
    const summaryDateEnd = new Date(`${body.endDate}T12:00:00Z`)
    summaryDateStart.setHours(0, 0, 0, 0)
    summaryDateEnd.setHours(0, 0, 0, 0)

    if (!congregationId || !startDate || !endDate) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // ⭐️ NOVO: Validação de Data Futura ⭐️
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera hora para comparação de apenas data

    if (summaryDateStart > today || summaryDateEnd > today) {
        return NextResponse.json({ error: "A data do resumo não pode ser futura." }, { status: 400 });
    }

    // Verificar se o usuário tem acesso à congregação
    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }
    console.log('Buscando lançamentos para congregação:', congregationId)
    console.log('Período:', summaryDateStart, 'a', summaryDateEnd)
    // Buscar lançamentos no período
    const launches = await prisma.launch.findMany({
      where: {
        congregationId,
        date: {
          gte: summaryDateStart,
          lte: summaryDateEnd
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

    // ⭐️ NOVO: Validação de Resumo Zerado (sem lançamentos) ⭐️
    if (launches.length === 0) {
        return NextResponse.json({ error: "Não há lançamentos no período para criar um resumo." }, { status: 400 });
    }

     // Calcular resumo de entradas
    const entradaSummary = {
      dizimo: 0,
      oferta: 0,
      votos: 0,
      campanha: 0,
      ebd: 0,
      total: 0
    }

    // Calcular resumo de saídas
    const saidaSummary = {
      saida: 0,
      total: 0
    }

    // Agrupar lançamentos por status de aprovação
    const approvalSummary = {
      pending: 0,
      approved: {
        treasury: 0,
        accountant: 0,
        director: 0,
        total: 0
      }
    }

    launches.forEach(launch => {
      if (launch.type === "ENTRADA") {
        entradaSummary.dizimo += launch.value || 0
        entradaSummary.oferta += launch.offerValue || 0
        entradaSummary.votos += launch.votesValue || 0
        entradaSummary.campanha += launch.campaignValue || 0
        entradaSummary.ebd += launch.ebdValue || 0
        entradaSummary.total += (launch.value || 0) + (launch.offerValue || 0) + (launch.votesValue || 0) + (launch.campaignValue || 0) + (launch.ebdValue || 0)
      } else if (launch.type === "DIZIMO") {
        // ⭐️ CORRIGIDO: Garante que o dízimo seja contabilizado.
        entradaSummary.dizimo += launch.value || 0
      } else if (launch.type === "SAIDA") {
        saidaSummary.saida += launch.value || 0
        saidaSummary.total += launch.value || 0
      }
    })
      // Contar por status de aprovação
    //   if (!launch.approvedByTreasurer || !launch.approvedByAccountant || !launch.approvedByDirector) {
    //     approvalSummary.pending += 1
    //   } else {
    //     approvalSummary.approved.total += 1
        
    //     // Aqui você precisaria adicionar um campo na tabela Launch para armazenar quem aprovou
    //     // Por enquanto, vamos considerar que todos os lançamentos aprovados foram aprovados pelo dirigente
    //     approvalSummary.approved.director += 1
    //   }


    // Buscar o resumo existente pelo identificador único
    const existingSummary = await prisma.congregationSummary.findFirst({
      where: {
        congregationId,
        startDate: summaryDateStart,
        endDate: summaryDateEnd
      }
    })

    if (existingSummary) {
      return NextResponse.json({ error: "Já existe um resumo para este período" }, { status: 400 })
    }
    const summary = await prisma.congregationSummary.create({
      data: {
        congregationId,
        startDate: summaryDateStart,
        endDate: summaryDateEnd,
        launchCount: launches.length,
        entryCount: entradaSummary.total,
        exitCount: saidaSummary.total,
        entryTotal: entradaSummary.total,
        titheTotal: entradaSummary.dizimo,
        exitTotal: saidaSummary.total,
        depositValue: 0,
        cashValue: 0,
        totalValue: entradaSummary.total - saidaSummary.total,
        titheValue: entradaSummary.dizimo,
        offerValue: entradaSummary.oferta,
        votesValue: entradaSummary.votos,
        ebdValue: entradaSummary.ebd,
        campaignValue: entradaSummary.campanha,
        exitValue: saidaSummary.saida,
        status: "PENDING"
      }
    })

    // ⭐️ NOVO PASSO: ATUALIZAR LANÇAMENTOS COM O summaryId ⭐️
    await prisma.launch.updateMany({
        where: {
            congregationId: summary.congregationId,
            date: {
                gte: summary.startDate,
                lte: summary.endDate,
            },
            summaryId: null, // Opcional: só atualiza lançamentos que ainda não têm um resumo (mais seguro)
            status: 'NORMAL', // Não atualiza lançamentos cancelados
        },
        data: {
            summaryId: summary.id, // Grava o ID do resumo recém-criado/atualizado
        },
    });

    // console.log("Resumo criado/atualizado:", summary)
    // return NextResponse.json(summary)
    return NextResponse.json({
      entradaSummary,
      saidaSummary,
      approvalSummary,
      launches,
      summary,
      period: {
        startDate,
        endDate
      }
    })
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

  try {
    const body = await request.json()
    const { 
      id, 
      depositValue, 
      cashValue, 
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