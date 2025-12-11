import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx-js-style'
import{ authOptions }from "../auth/[...nextauth]/route";

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
    const { startDate, endDate, type, congregationIds, status } = body

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
          status: { in: status },
        },
        include: {
          congregation: true,
          contributor: true,
          supplier: true,
          classification: true,
        }
      })

      const getFormattedTitle = (launch) => {
      if (launch.contributorId && !launch.contributor?.ecclesiasticalPosition.includes('MEMBRO','CONGREGADO')) {
        const cargoMap = {
          'AUXILIAR': 'Aux',
          'DIÁCONO': 'Dc',
          'PRESBÍTERO': 'Pb',
          'EVANGELISTA': 'Ev',
          'PASTOR': 'Pr',
        };
        const cargoAbreviado = cargoMap[launch.contributor.ecclesiasticalPosition] || '';
        return `DÍZIMOS E OFERTAS DE ${cargoAbreviado} - ${launch.contributor.name} - ${launch.contributor?.cpf}`;
      } else {
        if (launch.contributorName) {
          return `DÍZIMOS E OFERTAS DE ${launch.contributorName}`;
        } else {
          // Retorna a string original ou uma variação, caso contributorName não esteja preenchido
          return `DÍZIMOS E OFERTAS DE ${launch.contributor?.tipo} - ${launch.contributor.name} - ${launch.contributor?.cpf}`
        }
      }
      } 

      const launchData = launches.map(launch => ({
        "CNPJ/CPF do Fornecedor": launch.type === "SAIDA" ? launch.supplier?.cpfCnpj : "" ,
        "Código do Membro": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'MEMBRO' ? parseInt(launch.contributor?.code) : "": "",
        "Código do Congregado": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'CONGREGADO' ? parseInt(launch.contributor?.code) : "": "",
        "Nome de Outros": launch.type === "DIZIMO" ? launch.contributorName : launch.type === "SAIDA" ? launch.supplierName : launch.type === "OFERTA_CULTO" ? "OFERTA DO CULTO" : "",
        "Número do Documento": launch.talonNumber,
        "Data de Emissão": launch.date,
        "Data de Vencimento": "",
        //"Codigo da Conta a Pagar": "",
        "Código do Caixa": launch.type === "OFERTA_CULTO" ? parseInt(launch.congregation?.entradaOfferFinancialEntity) : 
                           launch.type === "MISSAO" ? parseInt(launch.congregation?.missionFinancialEntity) :
                           launch.type === "CIRCULO" ? parseInt(launch.congregation?.circleFinancialEntity) :
                           launch.type === "VOTO" ? parseInt(launch.congregation?.entradaVotesFinancialEntity) :
                           launch.type === "EBD" ? parseInt(launch.congregation?.entradaEbdFinancialEntity) :
                           launch.type === "CAMPANHA" ? parseInt(launch.congregation?.entradaCampaignFinancialEntity) :
                           launch.type === "DIZIMO" ? parseInt(launch.congregation?.dizimoFinancialEntity) : 
                           launch.type === "SAIDA" ? parseInt(launch.congregation?.saidaFinancialEntity) : "",
        "Código da Congregação": parseInt(launch.congregation.code),
        "Código da Forma de Pagamento": launch.type === "OFERTA_CULTO" ? parseInt(launch.congregation?.entradaOfferPaymentMethod) : 
                                        launch.type === "MISSAO" ? parseInt(launch.congregation?.missionPaymentMethod) :
                                        launch.type === "CIRCULO" ? parseInt(launch.congregation?.circlePaymentMethod) :
                                        launch.type === "VOTO" ? parseInt(launch.congregation?.entradaVotesPaymentMethod) :
                                        launch.type === "EBD" ? parseInt(launch.congregation?.entradaEbdPaymentMethod) :
                                        launch.type === "CAMPANHA" ? parseInt(launch.congregation?.entradaCampaignPaymentMethod) :
                                        launch.type === "DIZIMO" ? parseInt(launch.congregation?.dizimoPaymentMethod) : 
                                        launch.type === "SAIDA" ? parseInt(launch.congregation?.saidaPaymentMethod) : "",
        //"Nome da Congregação": launch.congregation.name,
        "Valor": launch.value ,
        "Codigo de Conta" : launch.type === "OFERTA_CULTO" ? launch.congregation?.entradaOfferAccountPlan : 
                            launch.type === "MISSAO" ? launch.congregation?.missionAccountPlan :
                            launch.type === "CIRCULO" ? launch.congregation?.circleAccountPlan :
                            launch.type === "VOTO" ? launch.congregation?.entradaVotesAccountPlan :
                            launch.type === "EBD" ? launch.congregation?.entradaEbdAccountPlan :
                            launch.type === "CAMPANHA" ? launch.congregation?.entradaCampaignAccountPlan :
                            launch.type === "DIZIMO" ? launch.congregation?.dizimoAccountPlan : 
                            launch.type === "SAIDA" ? launch.classification?.code : "",
        "Tipo": launch.type === "SAIDA" ? "D" : "C",
        "Historico": launch.type !== "DIZIMO" && launch.type !== "OFERTA_CULTO" && launch.type !== "SAIDA" ? launch.description  : 
                     launch.type === "DIZIMO" ? getFormattedTitle(launch) :
                     launch.type === "OFERTA_CULTO" ? "OFERTA DO CULTO" :
                     launch.type === "SAIDA" ? launch.classification?.description : "",
        "Parcelas": "",
        "Codigo de Departamento" : ""
      }))

      // Criar sheet (preservando objetos Date em launchData)
      const launchSheet = XLSX.utils.json_to_sheet(launchData, { dateNF: 'dd/mm/yyyy' })

      // cabeçalhos e colunas que devem ficar alinhadas à direita
      const headers = Object.keys(launchData[0] || {})
      const rightAlign = [
        "Código do Membro",
        "Data de Emissão",
        "Código do Caixa",
        "Código da Congregação",
        "Código da Forma de Pagamento"
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

          // alinhar colunas específicas à direita
          const headerName = headers[c] || ''
          if (rightAlign.includes(headerName)) {
            cell.s.alignment = { horizontal: 'right', vertical: 'center' }
          } else {
            cell.s.alignment = cell.s.alignment || { horizontal: 'left', vertical: 'center' }
          }

          // tratar datas: garantir formato e tipo de célula
          if (cell.v instanceof Date || (typeof cell.v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(cell.v))) {
            // converter string ISO para Date se necessário
            const dateVal = cell.v instanceof Date ? cell.v : new Date(cell.v)
            if (!isNaN(dateVal.getTime())) {
              cell.t = 'd'
              cell.v = dateVal
              cell.z = 'dd/mm/yyyy'
              // alinhar data à direita também
              cell.s.alignment = { horizontal: 'right', vertical: 'center' }
            }
          }

          // formatar coluna Valor como numérico com 2 casas
          if (headerName === 'Valor') {
            cell.t = typeof cell.v === 'number' ? 'n' : cell.t
            cell.z = '#,##0.00'
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
