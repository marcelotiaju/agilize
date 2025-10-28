import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Buscar apenas congregações vinculadas ao usuário
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        congregationId: true
      }
    })

    const congregationIds = userCongregations.map(uc => uc.congregationId)

    const congregations = await prisma.congregation.findMany({
      where: {
        id: {
          in: congregationIds
        }
      },
      include: {
        users: {
          where: {
            userId: session.user.id
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(congregations)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar congregações" }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      code, 
      name, 
      regionalName,
      entradaOfferAccountPlan,
      entradaOfferFinancialEntity,
      entradaOfferPaymentMethod,
      entradaEbdAccountPlan,
      entradaEbdFinancialEntity,
      entradaEbdPaymentMethod,      
      entradaCampaignAccountPlan,
      entradaCampaignFinancialEntity,
      entradaCampaignPaymentMethod,      
      entradaVotesAccountPlan,
      entradaVotesFinancialEntity,
      entradaVotesPaymentMethod,      
      dizimoAccountPlan,
      dizimoFinancialEntity,
      dizimoPaymentMethod,
      saidaFinancialEntity,
      saidaPaymentMethod,
      matriculaEnergisa,
      matriculaIgua,
      missionAccountPlan,
      missionFinancialEntity,
      missionPaymentMethod,
      circleAccountPlan,
      circleFinancialEntity,
      circlePaymentMethod
    } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Código e nome são obrigatórios" }, { status: 400 })
    }

    const congregation = await prisma.congregation.create({
      data: {
        code,
        name,
        regionalName,
        entradaOfferAccountPlan,
        entradaOfferFinancialEntity,
        entradaOfferPaymentMethod,
        entradaEbdAccountPlan,
        entradaEbdFinancialEntity,
        entradaEbdPaymentMethod,      
        entradaCampaignAccountPlan,
        entradaCampaignFinancialEntity,
        entradaCampaignPaymentMethod,      
        entradaVotesAccountPlan,
        entradaVotesFinancialEntity,
        entradaVotesPaymentMethod,  
        dizimoAccountPlan,
        dizimoFinancialEntity,
        dizimoPaymentMethod,
        saidaFinancialEntity,
        saidaPaymentMethod,
        matriculaEnergisa,
        matriculaIgua,
        missionAccountPlan,
        missionFinancialEntity,
        missionPaymentMethod,
        circleAccountPlan,
        circleFinancialEntity,
        circlePaymentMethod
    }})

    // Associar o usuário atual à nova congregação
    // await prisma.userCongregation.create({
    //   data: {
    //     userId: session.user.id,
    //     congregationId: congregation.id
    //   }
    // })
    console.log(congregation)

    return NextResponse.json(congregation, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar congregação" }, { status: 500 })
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
      code, 
      name,
      regionalName, 
      entradaOfferAccountPlan,
      entradaOfferFinancialEntity,
      entradaOfferPaymentMethod,
      entradaEbdAccountPlan,
      entradaEbdFinancialEntity,
      entradaEbdPaymentMethod,      
      entradaCampaignAccountPlan,
      entradaCampaignFinancialEntity,
      entradaCampaignPaymentMethod,      
      entradaVotesAccountPlan,
      entradaVotesFinancialEntity,
      entradaVotesPaymentMethod,  
      dizimoAccountPlan,
      dizimoFinancialEntity,
      dizimoPaymentMethod,
      saidaFinancialEntity,
      saidaPaymentMethod,
      matriculaEnergisa,
      matriculaIgua,
      missionAccountPlan,
      missionPaymentMethod,
      missionFinancialEntity,
      circleAccountPlan,
      circleFinancialEntity,
      circlePaymentMethod
    } = body

    const congregation = await prisma.congregation.update({
      where: { id },
      data: {
        code,
        name,
        regionalName,
        entradaOfferAccountPlan,
        entradaOfferFinancialEntity,
        entradaOfferPaymentMethod,
        entradaEbdAccountPlan,
        entradaEbdFinancialEntity,
        entradaEbdPaymentMethod,      
        entradaCampaignAccountPlan,
        entradaCampaignFinancialEntity,
        entradaCampaignPaymentMethod,      
        entradaVotesAccountPlan,
        entradaVotesFinancialEntity,
        entradaVotesPaymentMethod,  
        dizimoAccountPlan,
        dizimoFinancialEntity,
        dizimoPaymentMethod,
        saidaFinancialEntity,
        saidaPaymentMethod,
        matriculaEnergisa,
        matriculaIgua,
        missionAccountPlan,
        missionFinancialEntity,
        missionPaymentMethod,
        circleAccountPlan,
        circleFinancialEntity,
        circlePaymentMethod
      }
    })

    return NextResponse.json(congregation)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar congregação" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID da congregação é obrigatório" }, { status: 400 })
    }

    console.log('API: Excluindo congregação:', id)

    // Verifica se a congregação tem relacionamentos antes de excluir
    const congregation = await prisma.congregation.findUnique({
      where: { id },
      include: {
        contributors: true,
        launches: true,
        users: true
      }
    })

    if (!congregation) {
      return NextResponse.json({ error: "Congregação não encontrada" }, { status: 404 })
    }

    if (congregation.contributors.length > 0 || congregation.launches.length > 0) {
      return NextResponse.json({ 
        error: "Não é possível excluir uma congregação que possui contribuintes ou lançamentos" 
      }, { status: 400 })
    }

    await prisma.congregation.delete({
      where: { id }
    })

    console.log('API: Congregação excluída com sucesso')
    return NextResponse.json({ message: "Congregação excluída com sucesso" })
  } catch (error) {
    console.error('API: Erro ao excluir congregação:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
