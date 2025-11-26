import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
import { start } from "repl";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const congregationId = searchParams.get('congregationId')
    const searchTerm = searchParams.get('searchTerm') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    const skip = (page - 1) * limit

    let where: any = {}
    
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id
      },select: {
        congregationId: true
      }
    })

    where.congregationId = {
      in: userCongregations.map(uc => uc.congregationId)
    }

    if (congregationId && congregationId !== 'all') {
      where.congregationId = congregationId
    }

    // Handle date filtering with proper timezone awareness
//     if (startDate && endDate) {
//       // Convert the dates to the user's timezone and get start/end of day
//       const startZoned = utcToZonedTime(new Date(startDate), timezone)
//       const endZoned = utcToZonedTime(new Date(endDate), timezone)
      
//       // Get start of day and end of day in the user's timezone
//       const startOfDayZoned = startOfDay(startZoned)
//       const endOfDayZoned = endOfDay(endZoned)
      
//       // Convert back to UTC for database query
//       const startUtc = zonedTimeToUtc(startOfDayZoned, timezone)
//       const endUtc = zonedTimeToUtc(endOfDayZoned, timezone)
// //console.log(startUtc,endUtc)
//       where.date = {
//         gte: startUtc,
//         lte: endUtc
//       }
//      }

    //1. Adiciona o filtro de data
    // if (startDate && endDate)  {
    //     const launchDateStart = new Date(startDate);
    //     const launchDateEnd = new Date(endDate);
    //     launchDateStart.setHours(0, 0, 0, 0)
    //     launchDateEnd.setHours(23,59, 59, 999)
    // const dataStringUTC = "2025/11/24 00:00:00".replace(' ', 'T') + 'Z';
    // const dataObjeto = new Date(dataStringUTC);

    // // Agora, para exibição, você pode usar métodos que consideram o fuso horário local ou UTC
    // const dia = dataObjeto.getDate();
    // const mes = dataObjeto.getMonth() + 1; // getMonth() é de 0 a 11
    // const ano = dataObjeto.getFullYear();
        where.date = {
          gte: startDate ? startOfDay(utcToZonedTime(new Date(startDate), timezone)) : undefined,
          lte: endDate ? endOfDay(utcToZonedTime(new Date(endDate), timezone)) : undefined
        }
        console.log(where.date)
      //where.date.gte;
      // where.date.gte.setHours(0, 0, 0, 0);
      // where.date.lte.setHours(20, 59, 0, 0);
      //console.log(launchDateStart,launchDateEnd)
      //} 

      // const dataStringUTC = startDate.replace(' ', 'T') + 'Z';
      // const dataObjeto = new Date(dataStringUTC);

    if (searchTerm ) {
      where.OR = [
        { description: { contains: searchTerm } },
        { talonNumber: { contains: searchTerm } },
        { contributor: { name: { contains: searchTerm } } },
        { supplier: { razaoSocial: { contains: searchTerm } } },
        { supplierName: { contains: searchTerm } },
        { contributorName: { contains: searchTerm } },
        // { type: { contains: searchTerm } }
      ]
    }
 //console.log(`SearchTerm ${searchTerm}`)

    // Adicionar filtro de pesquisa
    // if (searchTerm) {
    //   where.OR = [
    //     { description: { contains: searchTerm, mode: 'insensitive' } },
    //     { talonNumber: { contains: searchTerm, mode: 'insensitive' } },
    //     { contributor: { name: { contains: searchTerm, mode: 'insensitive' } } },
    //     { supplier: { name: { contains: searchTerm, mode: 'insensitive' } } }
    //   ]
    // }

    // Buscar lançamentos com paginação
      const [launches, totalCount] = await Promise.all([
      prisma.launch.findMany({
        where,
        include: {
          congregation: true,
          contributor: true,
          supplier: true,
          classification: true
        },
        orderBy: [
          { date: 'desc' }, // Primeiro, ordena pela data (mais recente primeiro)
          { type: 'asc' },  // Em seguida, ordena pelo tipo (ordem alfabética)
          { createdAt: 'desc' }    // Por fim, usa o ID como critério de desempate (garante consistência)
        ],
        skip,
        take: limit
      }),
      prisma.launch.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)
    return NextResponse.json({
      launches,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      }
    })
  } catch (error) {
    console.error("Erro ao buscar lançamentos:", error)
    return NextResponse.json({ error: "Erro ao buscar lançamentos" }, { status: 500 })
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
      type,
      date,
      talonNumber,
      value,
      description,
      contributorId,
      contributorName,
      supplierId,
      supplierName,
      classificationId,
      isContributorRegistered,
      isSupplierRegistered
    } = body

    // Verificar permissões de lançamento
    // if (type === "ENTRADA" && !session.user.canLaunchEntry) {
    //   return NextResponse.json({ error: "Sem permissão para lançar entradas" }, { status: 403 })
    // }
    // if (type === "DIZIMO" && !session.user.canLaunchTithe) {
    //   return NextResponse.json({ error: "Sem permissão para lançar dízimos" }, { status: 403 })
    // }
    // if (type === "SAIDA" && !session.user.canLaunchExpense) {
    //   return NextResponse.json({ error: "Sem permissão para lançar saídas" }, { status: 403 })
    // }

    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
      },
        select: { congregationId: true
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    const timezone = 'America/Fortaleza'; 
    
    // 1. Criar um ponto no tempo seguro (Meio-dia local) para a data escolhida.
    const localDateTimeString = `${date}T12:00:00`; 
    const dateZoned = utcToZonedTime(new Date(localDateTimeString), timezone)
    const launchDate = zonedTimeToUtc(dateZoned, timezone)
    launchDate.setHours(launchDate.getHours() + 3) // Ajuste para UTC
    //let launchDate = zonedTimeToUtc(localDateTimeString, timezone); 
//console.log(launchDate)
    // 2. Verificação de Data Futura (usando apenas o dia para comparação)
    const today = new Date();
    // Comparar apenas a data (ignorando a hora)
    if (new Date(date) > today) {
      return NextResponse.json({ error: "Não é permitido lançar com data futura" }, { status: 400 })
    }
    // if (launchDate > today) {
    //   return NextResponse.json({ error: "Não é permitido lançar com data futura" }, { status: 400 })
    // }

        // Validação para classificação obrigatória em saídas
    if (type === "SAIDA" && !classificationId) {
      return NextResponse.json({ error: "Classificação é obrigatória para lançamentos do tipo Saída" }, { status: 400 })
    }

    // Validação para classificação obrigatória em saídas
    if (!congregationId) {
      return NextResponse.json({ error: "Congregação é obrigatória" }, { status: 400 })
    }

    // Validação para contribuinte obrigatório em dízimos
    if (type === "DIZIMO" && !contributorId && !contributorName) {
      return NextResponse.json({ error: "Nome do contribuinte é obrigatório para lançamentos do tipo Dízimo" }, { status: 400 })
    }


    // const existingLaunch = await prisma.launch.findFirst({
    //   where: {
    //     congregationId,
    //     date: launchDate,
    //     type,
    //     status: "NORMAL"
    //   }
    // })

    // if (existingLaunch) {
    //   return NextResponse.json({ error: "Já existe um lançamento deste tipo para esta data" }, { status: 400 })
    // }

    // Se for dízimo com contribuinte não cadastrado, criar o contribuinte
    // let finalContributorId = contributorId
    // if (type === "DIZIMO" && !contributorId && contributorName) {
    //   const newContributor = await prisma.contributor.create({
    //     data: {
    //       congregationId,
    //       date: launchDate,
    //       talonNumber: talonNumber || "",
    //       name: contributorName,
    //       value: parseFloat(value) || 0,
    //       status: "NORMAL"
    //     }
    //   })
    //   finalContributorId = newContributor.id
    // }

    // Se for saída com fornecedor não cadastrado, criar o fornecedor
    // let finalSupplierId = supplierId
    // if (type === "SAIDA" && !supplierId && supplierName) {
    //   const newSupplier = await prisma.supplier.create({
    //     data: {
    //       name: supplierName
    //     }
    //   })
    //   finalSupplierId = newSupplier.id
    // }
        
    const launch = await prisma.launch.create({
      data: {
        congregationId: congregationId,
        type,
        date: launchDate,
        talonNumber,
        value: parseFloat(value) || null,
        description,
        status: "NORMAL",
        // Lógica ajustada para o Dízimo
        contributorId: type === "DIZIMO" && isContributorRegistered ?  contributorId : null,
        contributorName: type === "DIZIMO" && !isContributorRegistered ? contributorName : null,
        // Lógica ajustada para a Saída
        supplierName: type === "SAIDA" && !isSupplierRegistered ? supplierName : null,
        supplierId: type === "SAIDA" && isSupplierRegistered ? supplierId : null,
        classificationId: type === "SAIDA" ? classificationId : null // Apenas para saída
      },
      include: {
        congregation: true,
        contributor: true,
        supplier: true,
        classification: true
      }
    })

    return NextResponse.json(launch, { status: 201 })
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {

    const body = await request.json();
    const { id, status, approved, ...updateData } = body;

    const launch = await prisma.launch.findUnique({
      where: { id },
      include: {
        congregation: true,
        contributor: true,
        supplier: true
      }
    })

    if (!launch) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
    }

    const userCongregation = await prisma.userCongregation.findFirst({
      where: {
        userId: session.user.id,
        congregationId: launch.congregationId
      }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    if (launch.status === "EXPORTED") {
      return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
    }

    if (launch.status === "CANCELED" && status === "NORMAL") {
      return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 })
    }

    // Verificar permissões de aprovação
    // if (approved !== undefined) {
    //   if (launch.type === "ENTRADA" && !session.user.canApproveEntry) {
    //     return NextResponse.json({ error: "Sem permissão para aprovar entradas" }, { status: 403 })
    //   }
    //   if (launch.type === "DIZIMO" && !session.user.canApproveTithe) {
    //     return NextResponse.json({ error: "Sem permissão para aprovar dízimos" }, { status: 403 })
    //   }
    //   if (launch.type === "SAIDA" && !session.user.canApproveExpense) {
    //     return NextResponse.json({ error: "Sem permissão para aprovar saídas" }, { status: 403 })
    //   }
    // }

    // const updatedLaunch = await prisma.launch.update({
    //   where: { id },
    //   data: { status }
    // })

    //const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (approved !== undefined) updateData.approved = approved

    const updatedLaunch = await prisma.launch.update({
      where: { id },
      data: { 
        ...updateData, 
        status, 
        approved,
        value: updateData.value ? parseFloat(updateData.value) : null,
        supplierId: updateData.supplierId ? parseInt(updateData.supplierId) : null,
        contributorId: updateData.contributorId ? parseInt(updateData.contributorId) : null,
        talonNumber: updateData.talonNumber ? updateData.talonNumber : null,
        classificationId: updateData.classificationId ? updateData.classificationId : null,
        date: updateData.date ? new Date(updateData.date) : undefined,
        type: updateData.type ? updateData.type : undefined,
        description: body.description ? body.description : undefined
      },
      include: {
        congregation: true,
        contributor: true,
        supplier: true
      }
    })

    return NextResponse.json(updatedLaunch)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
  }
}
