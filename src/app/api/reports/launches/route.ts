import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"
import { utcToZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import path from "path"
import fs from 'fs'

// Função auxiliar para formatar tipo de lançamento
function formatLaunchType(type: string): string {
  const types: { [key: string]: string } = {
    'DIZIMO': 'Dízimo',
    'OFERTA_CULTO': 'Oferta do Culto',
    'VOTO': 'Voto',
    'EBD': 'EBD',
    'CAMPANHA': 'Campanha',
    'MISSAO': 'Missão',
    'CIRCULO': 'Círculo de Oração',
    'CARNE_REVIVER': 'Carnê Reviver',
    'CARNE_AFRICA': 'Carnê África',
    'RENDA_BRUTA': 'Renda Bruta',
    'SAIDA': 'Saída'
  }
  return types[type] || type
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const prisma = await getDb(request)

  const { searchParams } = new URL(request.url)
  const congregationIds = searchParams.get('congregationIds')?.split(',') || []
  const types = searchParams.get('types')?.split(',') || []
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const onlyData = searchParams.get('onlyData') === 'true'
  const preview = searchParams.get('preview') === 'true'
  const timezone = 'America/Maceio'
  const importFilter = searchParams.get('importFilter') || 'ALL'

  try {
    const congregations = await prisma.congregation.findMany({
      where: { id: { in: congregationIds } },
      orderBy: { name: 'asc' }
    })

    const launches = await prisma.launch.findMany({
      where: {
        congregationId: { in: congregationIds },
        type: { in: types as any },
        date: {
          gte: startOfDay(new Date(startDate)),
          lte: endOfDay(new Date(endDate)),
        },
        status: {
          ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } :
            importFilter === 'INTEGRATED' ? { equals: 'INTEGRATED' } :
              importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'INTEGRATED', 'CANCELED'] } } :
                { not: 'CANCELED' }
        }
      },
      include: { congregation: true, contributor: true, supplier: true },
      orderBy: [{ date: 'asc' }]
    })

    const launchesByCongregation = launches.reduce((acc: any, launch) => {
      if (!acc[launch.congregationId]) acc[launch.congregationId] = []
      acc[launch.congregationId].push(launch)
      return acc
    }, {})

    const stats = congregations.map(c => {
      const cLaunches = launchesByCongregation[c.id] || []
      const entryLaunches = cLaunches.filter((l: any) => l.type !== 'SAIDA')
      const exitLaunches = cLaunches.filter((l: any) => l.type === 'SAIDA')

      const entrada = entryLaunches.reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)
      const saida = exitLaunches.reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)

      return {
        name: c.name,
        entrada,
        saida,
        totalCount: cLaunches.length
      }
    })

    const totalEntrada = stats.reduce((sum, s) => sum + s.entrada, 0)
    const totalSaida = stats.reduce((sum, s) => sum + s.saida, 0)
    const totalLaunchCount = stats.reduce((sum, s) => sum + s.totalCount, 0)

    if (onlyData || preview) {
      const congregationsPreview = congregations.map(cong => {
        const cLaunches = launchesByCongregation[cong.id] || []
        const entrada = cLaunches.filter((l: any) => l.type !== 'SAIDA').reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)
        const saida = cLaunches.filter((l: any) => l.type === 'SAIDA').reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)

        return {
          name: cong.name,
          launches: cLaunches.map((l: any) => ({
            id: l.id,
            type: l.type,
            date: l.date ? new Date(l.date).toISOString() : null,
            description: l.description,
            contributorName: l.contributorId ? l.contributor.name : l.contributorName || null,
            supplierName: l.supplierId ? l.supplier.name : l.supplierName || null,
            value: Number(l.value) || 0,
            isEntry: l.type !== 'SAIDA',
            nrDoc: l.talonNumber || '-',
            status: l.status
          })),
          entrada,
          saida
        }
      })

      return NextResponse.json({
        totalEntrada,
        totalSaida,
        totalLaunchCount,
        byCongregation: stats,
        congregations: congregationsPreview
      })
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const lineHeight = 7
    let yPos = margin

    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        return true
      }
      return false
    }

    try {
      const { getToken } = require("next-auth/jwt");
      const token = await getToken({ req: request });
      const alias = (token?.dbAlias) || "AGILIZE";
      let logoFileName = alias === "AGILIZE" ? "Logo.png" : "Logo_" + alias + ".png";
      let imgPath = path.join(process.cwd(), 'public', 'images', logoFileName);
      if (!require('fs').existsSync(imgPath)) {
        imgPath = path.join(process.cwd(), 'public', 'images', 'Logo.png');
      }
      if (fs.existsSync(imgPath)) {
        const imgData = fs.readFileSync(imgPath).toString('base64')
        const imgProps = doc.getImageProperties('data:image/png;base64,' + imgData)
        const ratio = imgProps.width / imgProps.height
        const printWidth = 15 * ratio
        doc.addImage(imgData, 'PNG', margin, yPos, printWidth, 10)
      }
    } catch {/* ignore */ }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin, yPos + 15)

    doc.setFontSize(11)
    doc.text('RELAÇÃO DE LANÇAMENTOS', margin, yPos + 22)
    yPos += 28

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    doc.text(`PERÍODO: ${startDate.substring(8, 10)}/${startDate.substring(5, 7)}/${startDate.substring(0, 4)} A ${endDate.substring(8, 10)}/${endDate.substring(5, 7)}/${endDate.substring(0, 4)}`, margin, yPos)
    yPos += 5
    doc.text(`Origem dos Lançamentos: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : importFilter === 'INTEGRATED' ? 'Integrados' : 'Apenas Digitados'}`, margin, yPos)
    yPos += 5
    const typeLabels = types.map(t => formatLaunchType(t))
    doc.text(`TIPOS: ${typeLabels.join(', ')}`, margin, yPos)

    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${session.user.name || 'N/A'}`, rightAlignX, yPos - 10, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, yPos - 5, { align: 'right' })

    yPos += lineHeight * 1.5

    for (const congregation of congregations) {
      const launches = launchesByCongregation[congregation.id] || []

      if (launches.length === 0) continue

      checkNewPage(lineHeight * 3)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`CONGREGAÇÃO: ${congregation.name}`, margin, yPos)
      yPos += lineHeight

      checkNewPage(lineHeight * 2)
      doc.setFillColor(0, 70, 140)
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.3)
      doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 10, 'FD')

      const colWidths = [18, 20, 60, 15, 22, 25, 30]
      const lineX1 = margin + colWidths[0]
      const lineX2 = lineX1 + colWidths[1]
      const lineX3 = lineX2 + colWidths[2]
      const lineX4 = lineX3 + colWidths[3]
      const lineX5 = lineX4 + colWidths[4]
      const lineX6 = lineX5 + colWidths[5]

      doc.line(lineX1, yPos - 5, lineX1, yPos + 5)
      doc.line(lineX2, yPos - 5, lineX2, yPos + 5)
      doc.line(lineX3, yPos - 5, lineX3, yPos + 5)
      doc.line(lineX4, yPos - 5, lineX4, yPos + 5)
      doc.line(lineX5, yPos - 5, lineX5, yPos + 5)
      doc.line(lineX5, yPos + 1, pageWidth - margin, yPos + 1)
      doc.line(lineX6, yPos + 1, lineX6, yPos + 5)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const colX = [
        margin + 2,
        margin + colWidths[0] + 2,
        margin + colWidths[0] + colWidths[1] + 2,
        margin + colWidths[0] + colWidths[1] + colWidths[2] + 2,
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2,
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2,
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2
      ]

      doc.text('DATA', colX[0], yPos)
      doc.text('TIPO', colX[1], yPos)
      doc.text('NOME', colX[2], yPos)
      doc.text('NRO', colX[3], yPos)
      doc.text('STATUS', colX[4], yPos)
      doc.text('     VALORES R$', colX[5] + 5, yPos)

      const originalYPos = yPos
      yPos += lineHeight * 0.5

      doc.setFontSize(7)
      doc.text('ENTRADA', colX[5] + 12, yPos, { align: 'right' })
      doc.text('SAÍDA', colX[6] + 15, yPos, { align: 'right' })

      yPos = originalYPos + 5
      doc.setTextColor(0, 0, 0)

      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += lineHeight * 0.5

      doc.setFont('helvetica', 'normal')
      let congEntrada = 0
      let congSaida = 0

      for (const launch of launches) {
        checkNewPage(lineHeight * 1.5)

        const launchDate = format(utcToZonedTime(launch.date, timezone), 'dd/MM/yyyy', { locale: ptBR })
        const tipo = formatLaunchType(launch.type)
        const nome = launch.contributor?.name || launch.supplier?.razaoSocial || launch.contributorName || launch.supplierName || launch.description || '-'
        const nro = launch.talonNumber || '-'
        const statusStr = launch.status === 'INTEGRATED' ? 'Integrado' :
          launch.status === 'IMPORTED' ? 'Importado' :
            launch.status === 'CANCELED' ? 'Cancelado' :
              launch.status === 'APPROVED' ? 'Aprovado' :
                launch.status === 'EXPORTED' ? 'Exportado' : 'Normal'
        const valor = launch.value || 0

        const nomeTruncado = doc.splitTextToSize(nome, colWidths[2] - 2)
        const maxLines = Math.max(1, nomeTruncado.length)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(launchDate, colX[0], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
        doc.text(tipo, colX[1], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))

        let nomeY = yPos
        nomeTruncado.forEach((line: string, idx: number) => {
          doc.text(line, colX[2], nomeY)
          nomeY += lineHeight * 0.8
        })

        doc.text(nro, colX[3], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
        doc.text(statusStr, colX[4], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))

        const valorFormatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        if (launch.type === 'SAIDA') {
          doc.text('-', colX[5] + 7, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          doc.text(`R$ ${valorFormatado}`, colX[6] + 15, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          congSaida += valor
        } else {
          doc.text(`R$ ${valorFormatado}`, colX[5] + 18, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          doc.text('-', colX[6] + 7, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          congEntrada += valor
        }

        yPos += lineHeight * maxLines
      }

      checkNewPage(lineHeight * 2)
      yPos += 2
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += lineHeight

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const totalEntradaFormatado = congEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const totalSaidaFormatado = congSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

      const cStats = stats.find(s => s.name === congregation.name)
      const cTotalCount = cStats?.totalCount || 0

      doc.text(`TOTAL CONGREGAÇÃO (Lançamentos: ${cTotalCount})`, colX[0], yPos)
      doc.text(`    R$ ${totalEntradaFormatado}`, colX[5] + 18, yPos, { align: 'right' })
      doc.text(congSaida > 0 ? `    R$ ${totalSaidaFormatado}` : `R$ -`, colX[6] + 15, yPos, { align: 'right' })
      yPos += lineHeight
      doc.text('SALDO CONGREGAÇÃO', colX[0], yPos)
      doc.text(`    R$ ${(Number(congEntrada) - Number(congSaida)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[6] + 15, yPos, { align: 'right' })
      yPos += lineHeight
    }

    checkNewPage(lineHeight * 2)
    yPos += 2
    doc.setFillColor(230, 242, 255)
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8, 'F')

    if (congregations.length > 1) {
      checkNewPage(lineHeight * 3)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`TOTAL GERAL DE TODAS AS CONGREGAÇÕES (Lançamentos: ${totalLaunchCount})`, margin, yPos)
      yPos += lineHeight
      const totalEntradaGeralFormatado = totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const totalSaidaGeralFormatado = totalSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      doc.text(`ENTRADA: R$ ${totalEntradaGeralFormatado}`, margin, yPos)
      yPos += lineHeight
      doc.text(`SAÍDA: R$ ${totalSaidaGeralFormatado}`, margin, yPos)
      yPos += lineHeight
      doc.text(`SALDO: R$ ${(Number(totalEntrada) - Number(totalSaida)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPos)
      yPos += lineHeight
    }

    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - margin)
    }

    const pdfBlob = doc.output('blob')
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_lancamentos.pdf"`
      }
    })

  } catch (error) {
    console.error("Erro ao gerar relatório de lançamentos:", error)
    return new NextResponse("Error generating report", { status: 500 })
  }
}