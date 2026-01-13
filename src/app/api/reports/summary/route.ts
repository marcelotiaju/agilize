import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz'
import path from "path/win32"

const fs = require('fs');
//const imagePath = path.join(process.cwd(), '../Logo.png');

const imageFile = fs.readFileSync('../agilize/public/images/Logo.png');
const base64String = Buffer.from(imageFile).toString('base64');

const formatCurrency = (val: number) => {
  if (val === 0) return '-'
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const typeLabels: Record<string, string> = {
    'DIZIMO': 'Dízimo',
    'OFERTA_CULTO': 'Oferta do Culto',
    'VOTO': 'Voto',
    'EBD': 'EBD',
    'CAMPANHA': 'Campanha',
    'MISSAO': 'Missão',
    'CIRCULO': 'Círculo de Oração',
    'CARNE_REVIVER': 'Carnê Reviver',
    'SAIDA': 'Saída'
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const summaryId = searchParams.get('summaryId')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    if (!summaryId) {
      return NextResponse.json({ error: "ID do resumo é obrigatório" }, { status: 400 })
    }

    // Buscar resumo com lançamentos
    const summary = await prisma.congregationSummary.findUnique({
      where: { id: summaryId },
      include: {
        Launch: {
          include: {
            contributor: {
              select: {
                name: true
              }
            }
          },
          orderBy: [
            { type: 'asc' },
            { date: 'asc' }
          ]
        },
        congregation: {
          select: {
            name: true
          }
        }
      }
    })

    if (!summary) {
      return NextResponse.json({ error: "Resumo não encontrado" }, { status: 404 })
    }

    // Iniciar PDF
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const margin = 15
    let y = 15
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Cabeçalho com logo
    doc.addImage(base64String, 'PNG', margin, y, 18, 18)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 22, y + 6)

    doc.setFontSize(10)
    doc.text('RELATÓRIO DE RESUMO', margin + 22, y + 12)

    // Info do resumo
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Congregação: ${summary.congregation?.name || 'N/A'}`, margin + 22, y + 18)

    // Data e usuário no canto direito
    const rightX = pageWidth - margin
    doc.text(`Usuário: ${session.user?.name || 'N/A'}`, rightX, y + 6, { align: 'right' })
    doc.text(format(utcToZonedTime(new Date(), timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR }), rightX, y + 12, { align: 'right' })

    y += 28

    // Período do resumo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const startDate = format(utcToZonedTime(summary.startDate, timezone), 'dd/MM/yyyy', { locale: ptBR })
    const endDate = format(utcToZonedTime(summary.endDate, timezone), 'dd/MM/yyyy', { locale: ptBR })
    doc.text(`Período: ${startDate} a ${endDate}`, margin, y)
    y += 10

    // Colunas da tabela
    const cols = {
      data: margin,
      contribuinte: margin + 25,
      tipo: margin + 95,
      valor: pageWidth - margin - 5
    }

    // Cabeçalho da tabela
    const drawTableHeader = () => {
      doc.setFillColor(0, 51, 102)
      doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('DATA', cols.data + 2, y + 5.5)
      doc.text('CONTRIBUINTE', cols.contribuinte, y + 5.5)
      doc.text('TIPO', cols.tipo, y + 5.5)
      doc.text('VALOR', cols.valor, y + 5.5, { align: 'right' })
      y += 10
    }

    drawTableHeader()

    // Pré-processar lançamentos para otimizar formatação
    const processedLaunches = summary.Launch.map((launch: any) => {
      const launchDateZoned = utcToZonedTime(launch.date, timezone)
      const launchDate = format(launchDateZoned, 'dd/MM/yyyy', { locale: ptBR })
      const contributorName = launch.contributor?.name || launch.contributorName || 'Não identificado'
      const typeLabel = typeLabels[launch.type] || launch.type
      const value = Number(launch.value)
      const valueFormatted = formatCurrency(value)
      
      return { launchDate, contributorName, typeLabel, value, valueFormatted, type: launch.type }
    })

    // Calcular totais por tipo
    const totaisPorTipo: Record<string, number> = {}
    let totalGeral = 0

    processedLaunches.forEach((processed) => {
      totaisPorTipo[processed.type] = (totaisPorTipo[processed.type] || 0) + processed.value
      totalGeral += processed.value
    })

    // Pré-formatar totais por tipo
    const totaisFormatados = Object.entries(totaisPorTipo).map(([tipo, valor]) => ({
      tipo,
      valor,
      valorFormatted: formatCurrency(valor),
      typeLabel: typeLabels[tipo] || tipo
    }))

    // Listar lançamentos
    processedLaunches.forEach((processed, index: number) => {
      // Verificar quebra de página
      if (y > pageHeight - 40) {
        doc.addPage()
        y = 15
        drawTableHeader()
      }

      // Zebra
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(margin, y - 1, pageWidth - margin * 2, 7, 'F')
      }

      doc.setTextColor(0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      doc.text(processed.launchDate, cols.data + 2, y + 4)
      doc.text(processed.contributorName.substring(0, 45), cols.contribuinte, y + 4)
      doc.text(processed.typeLabel, cols.tipo, y + 4)
      doc.text(processed.valueFormatted, cols.valor, y + 4, { align: 'right' })

      y += 7
    })

    // Linha separadora
    y += 3
    doc.setDrawColor(0, 51, 102)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5

    // Totais por tipo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAIS POR TIPO:', margin, y + 4)
    y += 8

    totaisFormatados.forEach((total) => {
      if (y > pageHeight - 25) {
        doc.addPage()
        y = 15
      }

      doc.setFont('helvetica', 'normal')
      doc.text(total.typeLabel, margin + 10, y + 4)
      doc.text(total.valorFormatted, cols.valor, y + 4, { align: 'right' })
      y += 6
    })

    // Total geral
    y += 3
    doc.setFillColor(0, 51, 102)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL GERAL:', margin + 2, y + 5.5)
    doc.text(formatCurrency(totalGeral), cols.valor, y + 5.5, { align: 'right' })

    // Numeração de páginas
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }

    const pdfBlob = doc.output('blob')
    return new NextResponse(pdfBlob, {
      headers: { 
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resumo-${summaryId}.pdf"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json({ error: "Erro interno ao gerar relatório" }, { status: 500 })
  }
}
