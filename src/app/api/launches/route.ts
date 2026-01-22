import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

// Função para remover acentos (normalizar texto)
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const congregationId = searchParams.get('congregationId')
    const searchTerm = searchParams.get('searchTerm') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    const skip = (page - 1) * limit

    let where: any = {}

    // 1. Definir os tipos permitidos com base nas permissões da sessão
    const allowedTypes: string[] = [];
    if (session.user.canLaunchTithe) allowedTypes.push('DIZIMO');
    if (session.user.canLaunchCarneReviver) allowedTypes.push('CARNE_REVIVER');
    if (session.user.canLaunchVote) allowedTypes.push('VOTO');
    if (session.user.canLaunchEbd) allowedTypes.push('EBD');
    if (session.user.canLaunchCampaign) allowedTypes.push('CAMPANHA');
    if (session.user.canLaunchMission) allowedTypes.push('MISSAO');
    if (session.user.canLaunchCircle) allowedTypes.push('CIRCULO');
    if (session.user.canLaunchOffering) allowedTypes.push('OFERTA_CULTO');
    if (session.user.canLaunchExpense) allowedTypes.push('SAIDA');

    // 2. Aplicar o filtro de segurança
    // Se o usuário já filtrou por um tipo específico via UI, verificamos se ele tem acesso a esse tipo
    const typeFilter = searchParams.get('type');
    if (typeFilter) {
      if (allowedTypes.includes(typeFilter)) {
        where.type = typeFilter;
      // } else {
      //   // Se ele tentou filtrar por algo que não tem acesso, forçamos um filtro que resultará em vazio
      //   where.type = 'NONE'; 
      }
    } else {
      // Se ele não filtrou nada, mostramos todos os tipos que ele tem permissão
      where.type = { in: allowedTypes };
    }

    // Se o usuário não tem nenhuma permissão de lançamento, retorna lista vazia
    if (allowedTypes.length === 0) {
      return NextResponse.json({ launches: [], totalCount: 0, totalPages: 0 });
    }
    
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
        //console.log(where.date)
      //where.date.gte;
      // where.date.gte.setHours(0, 0, 0, 0);
      // where.date.lte.setHours(20, 59, 0, 0);
      //console.log(launchDateStart,launchDateEnd)
      //} 

      // const dataStringUTC = startDate.replace(' ', 'T') + 'Z';
      // const dataObjeto = new Date(dataStringUTC);

    // Se houver termo de busca, aplicar filtro normalizado
    if (searchTerm) {
      const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase())
      
      // Buscar todos os lançamentos que atendem aos filtros (data, congregação, etc)
      // sem paginação para poder filtrar por texto normalizado
      const allLaunches = await prisma.launch.findMany({
        where,
        include: {
          congregation: true,
          contributor: true,
          supplier: true,
          classification: true
        },
        orderBy: [
          { date: 'desc' },
          { type: 'asc' },
          { createdAt: 'desc' }
        ]
      })
      
      // Filtrar resultados normalizando os textos
      const filteredLaunches = allLaunches.filter(launch => {
        const fieldsToSearch = [
          launch.description || '',
          launch.talonNumber || '',
          launch.contributorName || '',
          launch.supplierName || '',
          launch.contributor?.name || '',
          launch.supplier?.razaoSocial || ''
        ]
        
        return fieldsToSearch.some(field => {
          const normalizedField = removeAccents(field.toLowerCase())
          return normalizedField.includes(normalizedSearchTerm)
        })
      })
      
      // Aplicar paginação manualmente
      const paginatedLaunches = filteredLaunches.slice(skip, skip + limit)
      const totalCount = filteredLaunches.length
      const totalPages = Math.ceil(totalCount / limit)
      
      return NextResponse.json({
        launches: paginatedLaunches,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit
        }
      })
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

    // Se não houver termo de busca, fazer busca normal com paginação
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
          { date: 'desc' },
          { type: 'asc' },
          { createdAt: 'desc' }
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
    //console.log('POST /api/launches body:', body)

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

    const timezone = 'America/Sao_Paulo'
    
    const launchDate = parseDateToUtcInstant(date, timezone, false)
    // 1. Criar um ponto no tempo seguro (Meio-dia local) para a data escolhida.
    //const localDateTimeString = `${date}T12:00:00`; 
    //const dateZoned = utcToZonedTime(new Date(localDateTimeString), timezone)
    //const launchDate = zonedTimeToUtc(dateZoned, timezone)
    //launchDate.setHours(launchDate.getHours() + 3) // Ajuste para UTC
    //let launchDate = zonedTimeToUtc(localDateTimeString, timezone); 
//console.log(launchDate)
    // 2. Verificação de Data Futura (usando apenas o dia para comparação)

    // const dataStringUTC = date.replace(' ', 'T') + 'Z';
    // const dataObjeto = new Date(dataStringUTC);

    // Agora, para exibição, você pode usar métodos que consideram o fuso horário local ou UTC
    // const dia = dataObjeto.getDate();
    // const mes = dataObjeto.getMonth() + 1; // getMonth() é de 0 a 11
    // const ano = dataObjeto.getFullYear();
    // const launchDate = new Date(ano, mes - 1, dia + 1); // Meses são baseados em zero
    //console.log(launchDate)
    const today = new Date();
    // Comparar apenas a data (ignorando a hora) usando a data já parseada
    const todayStart = startOfDay(new Date())
    if (startOfDay(launchDate) > todayStart) {
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

    // Validação para contribuinte obrigatório em dízimos e carne reviver
    if ((type === "DIZIMO" || type === "CARNE_REVIVER") && !contributorId && !contributorName) {
      return NextResponse.json({ error: `Nome do contribuinte é obrigatório para lançamentos do tipo ${type === "DIZIMO" ? "Dízimo" : "Carne Reviver"}` }, { status: 400 })
    }

    // Validação de duplicidade baseada no tipo de lançamento
    const numericValue = parseFloat(value) || 0
    
    // Para DÍZIMO e CARNE_REVIVER: verificar Congregação + Data + Valor + Contribuinte apenas se contributorId estiver preenchido
    if (type === "DIZIMO" || type === "CARNE_REVIVER") {
      // Validação de duplicidade apenas se o contribuinte estiver registrado (contributorId preenchido)
      if (isContributorRegistered && contributorId) {
        const whereClause: any = {
          congregationId,
          date: launchDate,
          type: type,
          value: numericValue,
          contributorId,
          status: { in: ["NORMAL", "APPROVED"] }
        }
        
        const existingLaunch = await prisma.launch.findFirst({
          where: whereClause
        })
        
        if (existingLaunch) {
          return NextResponse.json({ 
            error: `Já existe um lançamento de ${type === "DIZIMO" ? "dízimo" : "carne reviver"} com a mesma congregação, data, valor e contribuinte` 
          }, { status: 400 })
        }
      }
      // Se não tiver contributorId (contribuinte anônimo ou não cadastrado), permite duplicação
    }
    // Para SAÍDA: verificar Congregação + Data + Valor + Fornecedor apenas se supplierId estiver preenchido
    else if (type === "SAIDA") {
      // Validação de duplicidade apenas se o fornecedor estiver registrado (supplierId preenchido)
      if (isSupplierRegistered && supplierId) {
        const whereClause: any = {
          congregationId,
          date: launchDate,
          type: "SAIDA",
          value: numericValue,
          supplierId,
          status: { in: ["NORMAL", "APPROVED"] }
        }
        
        const existingLaunch = await prisma.launch.findFirst({
          where: whereClause
        })
        
        if (existingLaunch) {
          return NextResponse.json({ 
            error: "Já existe um lançamento de saída com a mesma congregação, data, valor e fornecedor" 
          }, { status: 400 })
        }
      }
      // Se não tiver supplierId (fornecedor não cadastrado), permite duplicação
    }
    // Para os demais tipos (VOTO, EBD, CAMPANHA, MISSAO, CIRCULO, OFERTA_CULTO): verificar Congregação + Data + Valor
    else {
      const existingLaunch = await prisma.launch.findFirst({
        where: {
          congregationId,
          date: launchDate,
          type,
          value: numericValue,
          status: { in: ["NORMAL", "APPROVED"] }
        }
      })
      
      if (existingLaunch) {
        return NextResponse.json({ 
          error: `Já existe um lançamento do tipo ${type} com a mesma congregação, data e valor` 
        }, { status: 400 })
      }
    }

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
        // Lógica ajustada para o Dízimo e Carne Reviver
        contributorId: (type === "DIZIMO" || type === "CARNE_REVIVER") && isContributorRegistered ?  contributorId : null,
        contributorName: (type === "DIZIMO" || type === "CARNE_REVIVER") && !isContributorRegistered ? contributorName : null,
        // Lógica ajustada para a Saída
        supplierName: type === "SAIDA" && !isSupplierRegistered ? supplierName : null,
        supplierId: type === "SAIDA" && isSupplierRegistered ? supplierId : null,
        classificationId: type === "SAIDA" ? classificationId : null, // Apenas para saída
        createdBy: session.user.name,
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
    console.error("Erro ao criar lançamento:", error ?? error, { stack: (error as any)?.stack })
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // ler o body uma vez e usar
  const body = await request.json();

  try {
    const { id, status, ...updateData } = body;

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

    // Build update payload avoiding invalid type conversions (ids are strings)
    const timezone = 'America/Sao_Paulo'
    const dataToUpdate: any = {}

    // Função helper para parse de data (reutilizar mesma estratégia do POST)
    function parseDateToUtcInstantLocal(dateStr: string, timezoneLocal = timezone, endOfDayFlag = false): Date {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return zonedTimeToUtc(`${dateStr}T${endOfDayFlag ? '23:59:59.999' : '00:00:00'}`, timezoneLocal)
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split('/')
        const iso = `${yyyy}-${mm}-${dd}`
        return zonedTimeToUtc(`${iso}T${endOfDayFlag ? '23:59:59.999' : '00:00:00'}`, timezoneLocal)
      }
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) return parsed
      throw new Error('Invalid date format')
    }

    if (status !== undefined) dataToUpdate.status = status
    if (updateData.value !== undefined) {
      // 1. Garantir que é string e trata a vírgula para decimal
      const cleanValueString = String(updateData.value).replace('.', '').replace(',', '.')
      
      // 2. Tentar parsear para float
      const parsedValue = parseFloat(cleanValueString)
      
      // 3. Se for NaN (valor inválido ou vazio), define para 0 (se o campo for NOT NULL)
      //    Se for nullable, 'null' é a opção mais limpa, mas '0' é mais seguro contra 500.
      if (Number.isNaN(parsedValue)) {
          // SE `value` for NOT NULL no seu schema do Prisma, USE 0
          dataToUpdate.value = 0; 
          // SE `value` for NULLABLE no seu schema do Prisma, USE null (mas verifique o front-end)
          // dataToUpdate.value = null;
      } else {
          dataToUpdate.value = parsedValue
      }
    }
    if (updateData.supplierId !== undefined) {
      dataToUpdate.supplierId = updateData.supplierId || null // keep string IDs
    }
    if (updateData.contributorId !== undefined) {
      dataToUpdate.contributorId = updateData.contributorId || null
    }
    if (updateData.classificationId !== undefined) {
      dataToUpdate.classificationId = updateData.classificationId || null
    }
    if (updateData.talonNumber !== undefined) {
      dataToUpdate.talonNumber = updateData.talonNumber || null
    }
    if (updateData.date !== undefined && updateData.date !== null && updateData.date !== '') {
      try {
        dataToUpdate.date = parseDateToUtcInstantLocal(updateData.date)
      } catch (err) {
        return NextResponse.json({ error: "Formato de data inválido" }, { status: 400 })
      }
    }
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description
    if (updateData.contributorName !== undefined) {
      dataToUpdate.contributorName = updateData.contributorName || null
    }
    if (updateData.supplierName !== undefined) {
      dataToUpdate.supplierName = updateData.supplierName || null
    }

    // Validação de duplicidade na atualização (excluindo o próprio registro)
    // Usar os valores atualizados ou os valores atuais do lançamento
    const finalType = updateData.type || launch.type
    let finalDate = launch.date
    if (updateData.date !== undefined && updateData.date !== null && updateData.date !== '') {
      try {
        finalDate = parseDateToUtcInstantLocal(updateData.date)
      } catch (err) {
        // Se houver erro no parse, usar a data atual
      }
    }
    const finalValue = dataToUpdate.value !== undefined ? dataToUpdate.value : launch.value
    const finalCongregationId = updateData.congregationId || launch.congregationId
    const finalContributorId = updateData.contributorId !== undefined ? (updateData.contributorId || null) : launch.contributorId
    const finalContributorName = updateData.contributorName !== undefined ? (updateData.contributorName || null) : launch.contributorName
    const finalSupplierId = updateData.supplierId !== undefined ? (updateData.supplierId || null) : launch.supplierId
    const finalSupplierName = updateData.supplierName !== undefined ? (updateData.supplierName || null) : launch.supplierName

    // Para DÍZIMO e CARNE_REVIVER: verificar Congregação + Data + Valor + Contribuinte
    if (finalType === "DIZIMO" || finalType === "CARNE_REVIVER") {
      const whereClause: any = {
        congregationId: finalCongregationId,
        date: finalDate,
        type: finalType,
        value: finalValue,
        status: { in: ["NORMAL", "APPROVED"] },
        id: { not: id } // Excluir o próprio registro
      }
      
      if (finalContributorId) {
        whereClause.contributorId = finalContributorId
      } else if (finalContributorName) {
        whereClause.contributorName = finalContributorName
        whereClause.contributorId = null
      }
      
      const existingLaunch = await prisma.launch.findFirst({
        where: whereClause
      })
      
      if (existingLaunch) {
        return NextResponse.json({ 
          error: `Já existe um lançamento de ${finalType === "DIZIMO" ? "dízimo" : "carne reviver"} com a mesma congregação, data, valor e contribuinte` 
        }, { status: 400 })
      }
    }
    // Para SAÍDA: verificar Congregação + Data + Valor + Fornecedor
    else if (finalType === "SAIDA") {
      const whereClause: any = {
        congregationId: finalCongregationId,
        date: finalDate,
        type: "SAIDA",
        value: finalValue,
        status: { in: ["NORMAL", "APPROVED"] },
        id: { not: id }
      }
      
      if (finalSupplierId) {
        whereClause.supplierId = finalSupplierId
      } else if (finalSupplierName) {
        whereClause.supplierName = finalSupplierName
        whereClause.supplierId = null
      }
      
      const existingLaunch = await prisma.launch.findFirst({
        where: whereClause
      })
      
      if (existingLaunch) {
        return NextResponse.json({ 
          error: "Já existe um lançamento de saída com a mesma congregação, data, valor e fornecedor" 
        }, { status: 400 })
      }
    }
    // Para os demais tipos: verificar Congregação + Data + Valor
    else {
      const existingLaunch = await prisma.launch.findFirst({
        where: {
          congregationId: finalCongregationId,
          date: finalDate,
          type: finalType,
          value: finalValue,
          status: { in: ["NORMAL", "APPROVED"] },
          id: { not: id }
        }
      })
      
      if (existingLaunch) {
        return NextResponse.json({ 
          error: `Já existe um lançamento do tipo ${finalType} com a mesma congregação, data e valor` 
        }, { status: 400 })
      }
    }

    const updatedLaunch = await prisma.launch.update({
      where: { id },
      data: dataToUpdate,
      include: {
        congregation: true,
        contributor: true,
        supplier: true
      }
    })
    return NextResponse.json(updatedLaunch)
  } catch (error) {
    console.error("Erro ao atualizar lançamento:", error ?? error, { stack: (error as any)?.stack })
    // Se for um erro do Prisma (ex: falha de constraint)
      if ((error as any).code) {
          console.error("Código do erro Prisma:", (error as any).code);
          console.error("Meta do erro Prisma:", (error as any).meta);
          // Você pode até retornar um 400 se for um erro de validação de dados:
          // return NextResponse.json({ error: "Dados inválidos ou faltando (DB Constraint Error)" }, { status: 400 });
      }    
    return NextResponse.json({ error: "Erro ao atualizar lançamento..." }, { status: 500 })
  }
}
