import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx-js-style'
import { authOptions } from "../auth/[...nextauth]/route";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canExport) {
    return NextResponse.json({ error: "Sem permissão para exportar dados" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { startDate, endDate, type, congregationIds, approvalStatus, exportedStatus } = body

    let statusArray: any[] = [];
    if (exportedStatus === 'EXPORTED') {
      statusArray = ['EXPORTED'];
    } else {
      if (approvalStatus === 'APPROVED') {
        statusArray = ['APPROVED'];
      } else if (approvalStatus === 'NOT_APPROVED') {
        statusArray = ['NORMAL'];
      } else if (approvalStatus === 'BOTH') {
        statusArray = ['APPROVED', 'NORMAL'];
      }
      
      if (exportedStatus === 'BOTH') {
        statusArray.push('EXPORTED');
      }
    }

    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      }
    })

    if (userCongregations.length !== congregationIds.length) {
      return NextResponse.json({ error: "Acesso não autorizado a uma ou mais congregações" }, { status: 403 })
    }

    const launchDateStart = new Date(`${body.startDate}T12:00:00Z`)
    const launchDateEnd = new Date(`${body.endDate}T12:00:00Z`)
    launchDateStart.setHours(0, 0, 0, 0)
    launchDateEnd.setHours(0, 0, 0, 0)

    const workbook = XLSX.utils.book_new()

    function formatDate(date: Date): string {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês é de 0 a 11
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // if (type === "ENTRADA" || type === "DIZIMO" || type === "SAIDA") {
    const launches = await prisma.launch.findMany({
      where: {
        congregationId: { in: congregationIds },
        date: {
          gte: launchDateStart,
          lte: launchDateEnd
        },
        type: { in: type },
        OR: [
          { status: { in: statusArray } },
          {
            type: { in: ['CIRCULO', 'CARNE_REVIVER', 'CARNE_AFRICA', 'RENDA_BRUTA'] },
            status: 'NORMAL'
          }
        ]
      },
      include: {
        congregation: true,
        contributor: true,
        supplier: true,
        classification: true,
      }
    })

    const getFormattedTitle = (launch: any) => {
      const contributor = launch.contributor;
      if (launch.contributorId && contributor && contributor.ecclesiasticalPosition && !contributor.ecclesiasticalPosition.includes('MEMBRO')) {
        const cargoMap: Record<string, string> = {
          'AUXILIAR': 'Aux',
          'DIÁCONO': 'Dc',
          'PRESBÍTERO': 'Pb',
          'EVANGELISTA': 'Ev',
          'PASTOR': 'Pr',
        };
        const cargoAbreviado = cargoMap[contributor.ecclesiasticalPosition] || '';
        return `DÍZIMOS E OFERTAS DE ${cargoAbreviado} - ${contributor.name} - ${contributor?.cpf || ''}`;
      } else {
        if (launch.contributorName) {
          return `DÍZIMOS E OFERTAS DE ${launch.contributorName}`;
        } else if (contributor) {
          // Retorna a string original ou uma variação, caso contributorName não esteja preenchido
          return `DÍZIMOS E OFERTAS DE ${contributor.tipo || ''} - ${contributor.name || ''} - ${contributor?.cpf || ''}`
        }
        return "DÍZIMOS E OFERTAS";
      }
    }

    // função para remover caracteres especiais de CPF/CNPJ
    const cleanCpfCnpj = (value: string | null | undefined): string => {
      if (!value) return ""
      return value.replace(/\D/g, '') // remove tudo que não é dígito
    }

    const launchData = launches.map(launch => {
      // limpar cpf/cnpj e, se seguro (<=15 dígitos), converter para número
      const rawCpfCnpj = cleanCpfCnpj(launch.supplier?.cpfCnpj)
      const cpfCnpjValue = rawCpfCnpj === '' ? '' : (rawCpfCnpj.length <= 15 ? Number(rawCpfCnpj) : rawCpfCnpj)
      // criar Date no meio do dia UTC (12:00 UTC) para evitar mudança de dia por fuso horário
      const dt = new Date(launch.date)
      const exportDate = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0))
      //const exportDate = format(dt, 'yyyy-MM-dd')

      const congregation = launch.congregation as any;
      const classification = launch.classification as any;

      return ({
        "CNPJ/CPF do Fornecedor": launch.type === "SAIDA" ? cpfCnpjValue : "",
        "Código do Membro": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'MEMBRO' ? parseInt(launch.contributor?.code || '0') : "" : "",
        "Código do Congregado": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'CONGREGADO' ? parseInt(launch.contributor?.code || '0') : "" : "",
        "Nome de Outros": launch.type === "DIZIMO" ? launch.contributorName : launch.type === "SAIDA" ? launch.supplierName : (launch.type === "OFERTA_CULTO" || launch.type === "RENDA_BRUTA") ? (launch.type === "RENDA_BRUTA" ? "RENDA BRUTA" : "OFERTA DO CULTO") : "",
        "Número do Documento": parseInt(launch.talonNumber || '0') || "",
        "Data de Emissão": exportDate,
        "Data de Vencimento": "",
        //"Codigo da Conta a Pagar": "",
        "Código do Caixa": launch.type === "OFERTA_CULTO" || launch.type === "RENDA_BRUTA" ? parseInt(congregation?.entradaOfferFinancialEntity || '0') :
          launch.type === "MISSAO" ? parseInt(congregation?.missionFinancialEntity || '0') :
            launch.type === "CIRCULO" ? parseInt(congregation?.circleFinancialEntity || '0') :
              launch.type === "VOTO" ? parseInt(congregation?.entradaVotesFinancialEntity || '0') :
                launch.type === "EBD" ? parseInt(congregation?.entradaEbdFinancialEntity || '0') :
                  launch.type === "CAMPANHA" ? parseInt(congregation?.entradaCampaignFinancialEntity || '0') :
                    launch.type === "DIZIMO" ? parseInt(congregation?.dizimoFinancialEntity || '0') :
                      launch.type === "CARNE_REVIVER" || launch.type === "CARNE_AFRICA" ? parseInt(congregation?.entradaCarneReviverFinancialEntity || '0') :
                        launch.type === "SAIDA" ? parseInt(congregation?.saidaFinancialEntity || '0') : "",
        "Código da Congregação": parseInt(congregation.code || '0'),
        "Código da Forma de Pagamento": launch.type === "OFERTA_CULTO" || launch.type === "RENDA_BRUTA" ? parseInt(congregation?.entradaOfferPaymentMethod || '0') :
          launch.type === "MISSAO" ? parseInt(congregation?.missionPaymentMethod || '0') :
            launch.type === "CIRCULO" ? parseInt(congregation?.circlePaymentMethod || '0') :
              launch.type === "VOTO" ? parseInt(congregation?.entradaVotesPaymentMethod || '0') :
                launch.type === "EBD" ? parseInt(congregation?.entradaEbdPaymentMethod || '0') :
                  launch.type === "CAMPANHA" ? parseInt(congregation?.entradaCampaignPaymentMethod || '0') :
                    launch.type === "DIZIMO" ? parseInt(congregation?.dizimoPaymentMethod || '0') :
                      launch.type === "CARNE_REVIVER" || launch.type === "CARNE_AFRICA" ? parseInt(congregation?.entradaCarneReviverPaymentMethod || '0') :
                        launch.type === "SAIDA" ? parseInt(congregation?.saidaPaymentMethod || '0') : "",
        //"Nome da Congregação": launch.congregation.name,
        "Valor": parseFloat(launch.value as any) || 0,
        "Codigo de Conta": launch.type === "OFERTA_CULTO" || launch.type === "RENDA_BRUTA" ? congregation?.entradaOfferAccountPlan :
          launch.type === "MISSAO" ? congregation?.missionAccountPlan :
            launch.type === "CIRCULO" ? congregation?.circleAccountPlan :
              launch.type === "VOTO" ? congregation?.entradaVotesAccountPlan :
                launch.type === "EBD" ? congregation?.entradaEbdAccountPlan :
                  launch.type === "CAMPANHA" ? congregation?.entradaCampaignAccountPlan :
                    launch.type === "DIZIMO" ? congregation?.dizimoAccountPlan :
                      launch.type === "CARNE_REVIVER" || launch.type === "CARNE_AFRICA" ? congregation?.entradaCarneReviverAccountPlan :
                        launch.type === "SAIDA" ? classification?.code : "",
        "Tipo": launch.type === "SAIDA" ? "D" : "C",
        "Historico": launch.type !== "DIZIMO" && launch.type !== "OFERTA_CULTO" && launch.type !== "RENDA_BRUTA" && launch.type !== "SAIDA" ? launch.description :
          launch.type === "DIZIMO" ? getFormattedTitle(launch) :
            launch.type === "OFERTA_CULTO" ? "OFERTA DO CULTO" :
              launch.type === "RENDA_BRUTA" ? "RENDA BRUTA" :
                launch.type === "SAIDA" ? classification?.description : "",
        "Parcelas": "",
        "Codigo de Departamento": ""
      })
    })
    // Criar sheet (preservando objetos Date em launchData)
    const launchSheet = XLSX.utils.json_to_sheet(launchData, { dateNF: 'yyyy-mm-dd' })

    // cabeçalhos e colunas que devem ficar alinhadas à direita
    const headers = Object.keys(launchData[0] || {})
    launchSheet['!cols'] = headers.map(() => ({ wch: 18 }))
    const rightAlign = [
      "Código do Membro",
      "Data de Emissão",
      "Código do Caixa",
      "Código da Congregação",
      "Código da Forma de Pagamento",
      "Número do Documento",
      "Código do Congregado",
      "CNPJ/CPF do Fornecedor",
    ]

    // garantir referência !ref
    if (!launchSheet['!ref']) {
      const lastCol = headers.length ? XLSX.utils.encode_col(headers.length - 1) : 'A'
      launchSheet['!ref'] = `A1:${lastCol}${launchData.length + 1}`
    }

    const range = XLSX.utils.decode_range(launchSheet['!ref'])
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = launchSheet[addr]
        if (!cell) continue

        // definir fonte tamanho 10 (e cabeçalho em negrito)
        cell.s = cell.s || {}
        cell.s.font = { name: 'Calibri', sz: 10 } //, bold: r === range.s.r }

        const headerName = headers[c] || ''
        if (rightAlign.includes(headerName)) {
          cell.s.alignment = { horizontal: 'right', vertical: 'center' }
        } else {
          cell.s.alignment = cell.s.alignment || { horizontal: 'left', vertical: 'center' }
        }

        //tratar datas: garantir tipo e formato (usamos Date no launchData com 12:00 UTC para evitar shift)
        if (cell.v instanceof Date) {
          cell.t = 'd'
          cell.z = 'yyyy-mm-dd' // formato data sem hora
          // garantir que só exibe data, sem hora
          const dateOnly = new Date(cell.v.getFullYear(), cell.v.getMonth(), cell.v.getDate())
          cell.v = dateOnly
        }
        // formatar coluna Valor como numérico com 2 casas
        if (headerName === 'Valor' || headerName === 'Número do Documento' || headerName === 'Código do Membro' || headerName === 'Código da Congregação' ||
          headerName === 'Código do Caixa' || headerName === 'Código da Forma de Pagamento' ||
          headerName === 'Código do Congregado') {
          if (typeof cell.v === 'number') cell.t = 'n'
          //cell.z = '#,##0.00'
          cell.s.alignment = { horizontal: 'right', vertical: 'center' }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, launchSheet, "Planilha1")

    await prisma.launch.updateMany({
      where: {
        id: { in: launches.map(l => l.id) }
      },
      data: { status: 'EXPORTED' }
    })

    // gerar buffer com estilos (xlsx-js-style preserva .s)
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

    //const fileName = `export_${format(new Date(), 'yyyyMMddHHmmss')}.xlsx`
    const fileName = `export_${new Date().toISOString().split('T')[0]}.xlsx`
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao exportar dados" }, { status: 500 })
  }
}
