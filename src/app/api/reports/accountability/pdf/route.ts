import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"
import { startOfDay, endOfDay, format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import path from "path"
import fs from 'fs'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const prisma = await getDb(request)

  const { searchParams } = new URL(request.url)
  const congregationIds = searchParams.get('congregationIds')?.split(',') || []
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const importFilter = searchParams.get('importFilter') || 'ALL'
  const timezone = 'America/Maceio'

  try {
    const validTypes = ['DIZIMO', 'OFERTA_CULTO', 'EBD', 'VOTO', 'CAMPANHA', 'SAIDA']
    const launches = await prisma.launch.findMany({
      where: {
        congregationId: { in: congregationIds },
        type: { in: validTypes },
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
      include: {
        congregation: true,
        contributor: true,
        supplier: true,
        classification: true
      },
      orderBy: [{ date: 'asc' }]
    })

    // Grouping variables
    const taloesMap: Record<string, any> = {}
    const obreirosList: any[] = []
    const saidasList: any[] = []

    let totalTaloesDizimo = 0
    let totalTaloesOferta = 0
    let totalObreiros = 0
    let totalSaidas = 0

    // Process each launch
    for (const _l of launches) {
      const l = _l as any
      if (l.type === 'SAIDA') {
        saidasList.push({
          id: l.id,
          date: l.date,
          talonNumber: l.talonNumber || '-',
          supplierName: l.supplierId ? l.supplier?.name : l.supplierName || 'Diversos',
          classification: l.classification?.description || '-',
          value: Number(l.value) || 0
        })
        totalSaidas += Number(l.value) || 0
      } else if (l.type === 'DIZIMO') {
        const _pos = l.contributor?.ecclesiasticalPosition || 'Membro'
        const isMembro = _pos.toLowerCase() === 'membro' || _pos.toLowerCase() === 'congregado'

        if (isMembro) {
          // Talões
          const mapKey = l.talonNumber || 'S/N'
          if (!taloesMap[mapKey]) {
            taloesMap[mapKey] = { talonNumber: mapKey, date: l.date, dizimo: 0, oferta: 0, total: 0 }
          }
          const val = Number(l.value) || 0
          taloesMap[mapKey].dizimo += val
          taloesMap[mapKey].total += val
          totalTaloesDizimo += val
        } else {
          // Obreiros
          const val = Number(l.value) || 0
          obreirosList.push({
            id: l.id,
            date: l.date,
            talonNumber: l.talonNumber || '-',
            contributorName: l.contributorId ? l.contributor?.name : l.contributorName || '-',
            cargo: _pos,
            value: val
          })
          totalObreiros += val
        }
      } else if (['OFERTA_CULTO', 'EBD', 'VOTO', 'CAMPANHA'].includes(l.type)) {
        // Ofertas -> Talões
        const mapKey = l.talonNumber || 'S/N'
        if (!taloesMap[mapKey]) {
          taloesMap[mapKey] = { talonNumber: mapKey, date: l.date, dizimo: 0, oferta: 0, total: 0 }
        }
        const val = Number(l.value) || 0
        taloesMap[mapKey].oferta += val
        taloesMap[mapKey].total += val
        totalTaloesOferta += val
      }
    }

    const taloesArray = Object.values(taloesMap).sort((a: any, b: any) => {
      if (a.talonNumber === 'S/N') return 1;
      if (b.talonNumber === 'S/N') return -1;
      const numA = parseInt(a.talonNumber.replace(/\D/g, ''), 10);
      const numB = parseInt(b.talonNumber.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.talonNumber).localeCompare(String(b.talonNumber));
    })

    const totalTaloes = totalTaloesDizimo + totalTaloesOferta
    const resultado = totalTaloes + totalObreiros - totalSaidas

    // Gerar PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const lineHeight = 6
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
        const printWidth = 10 * ratio
        doc.addImage(imgData, 'PNG', margin, yPos, printWidth, 15)
      }
    } catch { /* ignore */ }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin, yPos + 20)

    doc.setFontSize(11)
    doc.text('PRESTAÇÃO DE CONTAS', margin, yPos + 27)
    yPos += 30

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const pStart = startDate ? startDate.substring(8, 10) + '/' + startDate.substring(5, 7) + '/' + startDate.substring(0, 4) : ''
    const pEnd = endDate ? endDate.substring(8, 10) + '/' + endDate.substring(5, 7) + '/' + endDate.substring(0, 4) : ''

    doc.text(`PERÍODO: ${pStart} A ${pEnd}`, margin, yPos)
    yPos += 5
    doc.text(`Origem dos Lançamentos: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : importFilter === 'INTEGRATED' ? 'Integrados' : 'Apenas Digitados'}`, margin, yPos)

    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${(session.user as any).name || 'N/A'}`, rightAlignX, yPos - 5, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, yPos, { align: 'right' })

    yPos += lineHeight * 2

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Seção 1: Talões
    checkNewPage(lineHeight * 6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`1. TALÕES`, margin, yPos)
    yPos += lineHeight

    doc.setFillColor(0, 70, 140)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 7, 'FD')

    const tColW = [23, 30, 40, 50]
    let currentX = margin
    for (const w of tColW) {
      currentX += w
      doc.line(currentX, yPos - 4, currentX, yPos + 3)
    }

    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)

    const maxColTaloes = [margin + 2, margin + 25, margin + 55, margin + 95, pageWidth - margin - 5]

    doc.text('NRO TALÃO', maxColTaloes[0], yPos + 1)
    doc.text('DATA', maxColTaloes[1], yPos + 1)
    doc.text('DÍZIMOS', maxColTaloes[2], yPos + 1)
    doc.text('OFERTAS', maxColTaloes[3], yPos + 1)
    doc.text('TOTAL', maxColTaloes[4], yPos + 1, { align: 'right' })
    yPos += lineHeight
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    for (const t of taloesArray) {
      checkNewPage(lineHeight)
      doc.text(String(t.talonNumber), maxColTaloes[0], yPos)
      doc.text(t.date ? format(utcToZonedTime(t.date, timezone), 'dd/MM/yyyy', { locale: ptBR }) : '-', maxColTaloes[1], yPos)
      doc.text(`R$ ${formatCurrency(t.dizimo)}`, maxColTaloes[2] + 20, yPos, { align: 'right' })
      doc.text(`R$ ${formatCurrency(t.oferta)}`, maxColTaloes[3] + 20, yPos, { align: 'right' })
      doc.text(`R$ ${formatCurrency(t.total)}`, maxColTaloes[4], yPos, { align: 'right' })
      yPos += lineHeight
    }

    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL TALÕES', maxColTaloes[0], yPos)
    doc.text(`R$ ${formatCurrency(totalTaloesDizimo)}`, maxColTaloes[2] + 20, yPos, { align: 'right' })
    doc.text(`R$ ${formatCurrency(totalTaloesOferta)}`, maxColTaloes[3] + 20, yPos, { align: 'right' })
    doc.text(`R$ ${formatCurrency(totalTaloes)}`, maxColTaloes[4], yPos, { align: 'right' })
    yPos += lineHeight * 2

    // Seção 2: Obreiros
    checkNewPage(lineHeight * 6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`2. DÍZIMOS E OBREIROS`, margin, yPos)
    yPos += lineHeight

    doc.setFillColor(0, 70, 140)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 7, 'FD')

    const oColW = [23, 25, 70, 30]
    let oCurrentX = margin
    for (const w of oColW) {
      oCurrentX += w
      doc.line(oCurrentX, yPos - 4, oCurrentX, yPos + 3)
    }

    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)

    const maxColObreiros = [margin + 2, margin + 25, margin + 50, margin + 120, pageWidth - margin - 5]

    doc.text('NRO RECIBO', maxColObreiros[0], yPos + 1)
    doc.text('DATA', maxColObreiros[1], yPos + 1)
    doc.text('NOME', maxColObreiros[2], yPos + 1)
    doc.text('CARGO', maxColObreiros[3], yPos + 1)
    doc.text('VALOR', maxColObreiros[4], yPos + 1, { align: 'right' })
    yPos += lineHeight
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    for (const o of obreirosList) {
      checkNewPage(lineHeight * 1.5)
      doc.text(String(o.talonNumber), maxColObreiros[0], yPos)
      doc.text(o.date ? format(utcToZonedTime(o.date, timezone), 'dd/MM/yyyy', { locale: ptBR }) : '-', maxColObreiros[1], yPos)

      const nomeTruncado = doc.splitTextToSize(String(o.contributorName), 65)
      doc.text(nomeTruncado[0] || '', maxColObreiros[2], yPos)

      const cargoTruncado = doc.splitTextToSize(String(o.cargo), 45)
      doc.text(cargoTruncado[0] || '', maxColObreiros[3], yPos)

      doc.text(`R$ ${formatCurrency(o.value)}`, maxColObreiros[4], yPos, { align: 'right' })
      yPos += lineHeight
    }

    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL DÍZIMOS E OBREIROS', maxColObreiros[0], yPos)
    doc.text(`R$ ${formatCurrency(totalObreiros)}`, maxColObreiros[4], yPos, { align: 'right' })
    yPos += lineHeight * 2

    // Seção 3: Saidas
    checkNewPage(lineHeight * 6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`3. SAÍDAS`, margin, yPos)
    yPos += lineHeight

    doc.setFillColor(0, 70, 140)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 7, 'FD')

    const sColW = [23, 25, 70, 30]
    let sCurrentX = margin
    for (const w of sColW) {
      sCurrentX += w
      doc.line(sCurrentX, yPos - 4, sCurrentX, yPos + 3)
    }

    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)

    const maxColSaidas = [margin + 2, margin + 25, margin + 50, margin + 120, pageWidth - margin - 5]

    doc.text('NRO DOC', maxColSaidas[0], yPos + 1)
    doc.text('DATA', maxColSaidas[1], yPos + 1)
    doc.text('FORNECEDOR', maxColSaidas[2], yPos + 1)
    doc.text('CLASSIFICAÇÃO', maxColSaidas[3], yPos + 1)
    doc.text('VALOR', maxColSaidas[4], yPos + 1, { align: 'right' })
    yPos += lineHeight
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    for (const s of saidasList) {
      checkNewPage(lineHeight * 1.5)
      doc.text(String(s.talonNumber), maxColSaidas[0], yPos)
      doc.text(s.date ? format(utcToZonedTime(s.date, timezone), 'dd/MM/yyyy', { locale: ptBR }) : '-', maxColSaidas[1], yPos)

      const fornTruncado = doc.splitTextToSize(String(s.supplierName), 65)
      doc.text(fornTruncado[0] || '', maxColSaidas[2], yPos)

      const clasTruncado = doc.splitTextToSize(String(s.classification), 45)
      doc.text(clasTruncado[0] || '', maxColSaidas[3], yPos)

      doc.text(`R$ ${formatCurrency(s.value)}`, maxColSaidas[4], yPos, { align: 'right' })
      yPos += lineHeight
    }

    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL SAÍDAS', maxColSaidas[0], yPos)
    doc.text(`R$ ${formatCurrency(totalSaidas)}`, maxColSaidas[4], yPos, { align: 'right' })
    yPos += lineHeight * 3

    // Resultado
    checkNewPage(lineHeight * 3)
    doc.setFontSize(12)
    doc.text('RESULTADO FINAL', margin, yPos)
    doc.text(`R$ ${formatCurrency(resultado)}`, maxColSaidas[4], yPos, { align: 'right' })

    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Prestacao_Contas.pdf"`,
      },
    })

  } catch (error) {
    console.error("Erro ao gerar relatório Prestação de Contas:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
