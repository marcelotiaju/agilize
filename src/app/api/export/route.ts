import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx'
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
          supplier: true
        }
      })

      // if (type === "DIZIMO") {
      // const launches = await prisma.launch.findMany({
      //   where: {
      //     congregationId: { in: congregationIds },
      //     date: {
      //       gte: new Date(startDate),
      //       lte: new Date(endDate)
      //     },
      //     status: "APPROVED",
      //     type: "DIZIMO"
      //   },
      //   include: {
      //     congregation: true,
      //     contributor: true,
      //     supplier: true,
      //     classification: true
      //   }
      // })}

      // // if (type === "SAIDA") {
      // const launches = await prisma.launch.findMany({
      //   where: {
      //     congregationId: { in: congregationIds },
      //     date: {
      //       gte: new Date(startDate),
      //       lte: new Date(endDate)
      //     },
      //     status: "APPROVED",
      //     type: type
      //   },
      //   include: {
      //     congregation: true,
      //     contributor: true,
      //     supplier: true,
      //     classification: true
      //   }
      // })
    // }

      const getFormattedTitle = (launch) => {
      if (launch.contributorId && !launch.contributor?.ecclesiasticalPosition.includes('MEMBRO','CONGREGADO')) {
        const cargoMap = {
          'AUXILIAR': 'Aux',
          'DIACONO': 'Dc',
          'PRESBITERO': 'Pb',
          'EVANGELISTA': 'Ev',
          'PASTOR': 'Pr',
        };
        const cargoAbreviado = cargoMap[launch.contributor.ecclesiasticalPosition] || '';
        return `DÍZIMOS E OFERTAS DE ${cargoAbreviado} - ${launch.contributor.name}`;
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
        "CPF/CNPJ Fornecedor": launch.type === "SAIDA" ? launch.supplier?.cpfCnpj : "" ,
        "Codigo do Membro": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'MEMBRO' ? launch.contributor?.code : "": "",
        "Codigo do Congregado": launch.type === "DIZIMO" ? launch.contributor?.tipo === 'CONGREGADO' ? launch.contributor?.code : "": "",
        "Nome de Outros": launch.type === "DIZIMO" ? launch.contributorName : launch.type === "SAIDA" ? launch.supplierName : "",
        "Numero do Documento": launch.talonNumber,
        "Data de Emissao": formatDate(launch.date),
        "Data de Vencimento": "",
        //"Codigo da Conta a Pagar": "",
        "Codigo do Caixa": launch.type === "OFERTA_CULTO" ? launch.congregation?.entradaOfferFinancialEntity : 
                           launch.type === "MISSAO" ? launch.congregation?.missionFinancialEntity :
                           launch.type === "CIRCULO" ? launch.congregation?.circleFinancialEntity :
                           launch.type === "VOTO" ? launch.congregation?.entradaVotesFinancialEntity :
                           launch.type === "EBD" ? launch.congregation?.entradaEbdFinancialEntity :
                           launch.type === "CAMPANHA" ? launch.congregation?.entradaCampaignFinancialEntity :
                           launch.type === "DIZIMO" ? launch.congregation?.dizimoFinancialEntity : 
                           launch.type === "SAIDA" ? launch.congregation?.saidaFinancialEntity : "",
        "Código da Congregação": launch.congregation.code,
        "Codigo da Forma de Pagamento": launch.type === "OFERTA_CULTO" ? launch.congregation?.entradaOfferPaymentMethod : 
                                        launch.type === "MISSAO" ? launch.congregation?.missionPaymentMethod :
                                        launch.type === "CIRCULO" ? launch.congregation?.circlePaymentMethod :
                                        launch.type === "VOTO" ? launch.congregation?.entradaVotesPaymentMethod :
                                        launch.type === "EBD" ? launch.congregation?.entradaEbdPaymentMethod :
                                        launch.type === "CAMPANHA" ? launch.congregation?.entradaCampaignPaymentMethod :
                                        launch.type === "DIZIMO" ? launch.congregation?.dizimoPaymentMethod : 
                                        launch.type === "SAIDA" ? launch.congregation?.saidaPaymentMethod : "",
        //"Nome da Congregação": launch.congregation.name,
        "Valor": launch.value ,
        "Codigo de Conta" : launch.type === "OFERTA_CULTO" ? launch.congregation?.entradaOfferAccountPlan : 
                            launch.type === "MISSAO" ? launch.congregation?.missionAccountPlan :
                            launch.type === "CIRCULO" ? launch.congregation?.circleAccountPlan :
                            launch.type === "VOTO" ? launch.congregation?.entradaVotesAccountPlan :
                            launch.type === "EBD" ? launch.congregation?.entradaEbdAccountPlan :
                            launch.type === "CAMPANHA" ? launch.congregation?.entradaCampaignAccountPlan :
                            launch.type === "DIZIMO" ? launch.congregation?.dizimoAccountPlan : "",
        "Tipo": launch.type === "SAIDA" ? "D" : "C",
        "Historico": launch.type !== "DIZIMO" ? launch.description || "" : 
                     launch.type === "DIZIMO" ? getFormattedTitle(launch) : "",
        "Parcelas": "",
        "Codigo de Departamento" : ""
      }))

      const launchSheet = XLSX.utils.json_to_sheet(launchData)
      XLSX.utils.book_append_sheet(workbook, launchSheet, "Planilha1")

      await prisma.launch.updateMany({
        where: {
          id: { in: launches.map(l => l.id) }
        },
        data: { status: 'EXPORTED' }
      })
  

    // if (type === "contributors" || type === "both") {
    //   const contributors = await prisma.contributor.findMany({
    //     where: {
    //       congregationId: { in: congregationIds },
    //       date: {
    //         gte: new Date(startDate),
    //         lte: new Date(endDate)
    //       },
    //       status: "NORMAL"
    //     },
    //     include: {
    //       congregation: true
    //     }
    //   })

    //   const contributorData = contributors.map(contributor => ({
    //     "Código da Congregação": contributor.congregation.code,
    //     "Nome da Congregação": contributor.congregation.name,
    //     "Data": contributor.date.toISOString().split('T')[0],
    //     "Nº do Talão": contributor.talonNumber,
    //     "Nome do Contribuinte": contributor.name,
    //     "CPF do Contribuinte": contributor.cpf || "",
    //     "Valor": contributor.value,
    //     "Descrição": contributor.description || "",
    //     "Status": contributor.status
    //   }))

    //   const contributorSheet = XLSX.utils.json_to_sheet(contributorData)
    //   XLSX.utils.book_append_sheet(workbook, contributorSheet, "Contribuintes")

    //   await prisma.contributor.updateMany({
    //     where: {
    //       id: { in: contributors.map(c => c.id) }
    //     },
    //     data: { exported: true }
    //   })
    // }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename=export_${new Date().toISOString().split('T')[0]}.xlsx`)

    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao exportar dados" }, { status: 500 })
  }
}
