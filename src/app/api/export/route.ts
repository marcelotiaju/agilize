import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx'
import { nextAuthOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  const session = await getServerSession(nextAuthOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canExport) {
    return NextResponse.json({ error: "Sem permissão para exportar dados" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { startDate, endDate, type, congregationIds } = body
console.log(body)
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      }
    })

    if (userCongregations.length !== congregationIds.length) {
      return NextResponse.json({ error: "Acesso não autorizado a uma ou mais congregações" }, { status: 403 })
    }

    const workbook = XLSX.utils.book_new()

      // if (type === "ENTRADA") {
      // const launches = await prisma.launch.findMany({
      //   where: {
      //     congregationId: { in: congregationIds },
      //     date: {
      //       gte: new Date(startDate),
      //       lte: new Date(endDate)
      //     },
      //     status: "NORMAL",
      //     type: "ENTRADA"
      //   },
      //   include: {
      //     congregation: true
      //   }
      // })}

      // if (type === "DIZIMO") {
      // const launches = await prisma.launch.findMany({
      //   where: {
      //     congregationId: { in: congregationIds },
      //     date: {
      //       gte: new Date(startDate),
      //       lte: new Date(endDate)
      //     },
      //     status: "NORMAL",
      //     type: "DIZIMO"
      //   },
      //   include: {
      //     congregation: true,
      //     contributor: true,
      //     supplier: true,
      //     classification: true
      //   }
      // })}

      // if (type === "SAIDA") {
      const launches = await prisma.launch.findMany({
        where: {
          congregationId: { in: congregationIds },
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          status: "NORMAL",
          type: type
        },
        include: {
          congregation: true,
          contributor: true,
          supplier: true,
          classification: true
        }
      })
    // }

      const launchData = launches.map(launch => ({
        "CPF/CNPJ Fornecedor": launch.type === "SAIDA" ? launch.supplier?.cpfCnpj :  "",
        "Codigo do Membro": launch.type === "DIZIMO" ? launch.contributor?.congregationId : "",
        "Codigo do Congregado": launch.type === "DIZIMO" ? launch.contributor?.congregationId : "",
        "Nome de Outros": launch.type === "DIZIMO" ? launch.contributorName : launch.type === "SAIDA" ? launch.supplierName : "",
        "Numero do Documento": launch.type === "DIZIMO" ? launch.talonNumber : "",
        "Data de Emissao": launch.date.toISOString().split('T')[0],
        "Data de Vencimento": launch.date.toISOString().split('T')[0],
        "Codigo da Conta a Pagar": launch.type === "ENTRADA" ? launch.congregation?.entradaAccountPlan : launch.type === "DIZIMO" ? launch.congregation?.dizimoAccountPlan : launch.type === "SAIDA" ? launch.congregation?.saidaAccountPlan : "",
        "Codigo do Caixa": launch.type === "ENTRADA" ? launch.congregation?.entradaFinancialEntity : launch.type === "DIZIMO" ? launch.congregation?.dizimoFinancialEntity : launch.type === "SAIDA" ? launch.congregation?.saidaFinancialEntity : "",
        "Código da Congregação": launch.congregation.code,
        "Codigo da Forma de Pagamento": launch.type === "ENTRADA" ? launch.congregation?.entradaPaymentMethod : launch.type === "DIZIMO" ? launch.congregation?.dizimoPaymentMethod : launch.type === "SAIDA" ? launch.congregation?.saidaPaymentMethod : "",
        "Nome da Congregação": launch.congregation.name,
        "Valor Oferta": launch.type === "ENTRADA" ? launch.offerValue || 0 : "",
        "Valor Votos": launch.type === "ENTRADA" ? launch.votesValue || 0 : "",
        "Valor EBD": launch.type === "ENTRADA" ? launch.ebdValue || 0 : "",
        "Valor": launch.type === "DIZIMO" || launch.type === "SAIDA" ? launch.value || 0 : "",
        "Codigo de Conta" : launch.classification?.code,
        "Tipo": launch.type === "SAIDA" ? "D" : "C",
        "Historico": launch.classification?.description || "",
        "Parcelas": "",
        "Codigo de Departamento" : ""
      }))

      const launchSheet = XLSX.utils.json_to_sheet(launchData)
      XLSX.utils.book_append_sheet(workbook, launchSheet, "Lançamentos")

      await prisma.launch.updateMany({
        where: {
          id: { in: launches.map(l => l.id) }
        },
        data: { exported: true }
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
