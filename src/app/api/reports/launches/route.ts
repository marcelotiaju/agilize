import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'

const fs = require('fs');

const imageFile = fs.readFileSync('./logo.png');
const base64String = Buffer.from(imageFile).toString('base64');

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
    'SAIDA': 'Saída'
  }
  return types[type] || type
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!(session.user as any).canGenerateReport) {
    return NextResponse.json({ error: "Sem permissão para gerar relatórios" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const congregationIds = searchParams.get('congregationIds')?.split(',') || []
    const types = searchParams.get('types')?.split(',') || []
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    if (congregationIds.length === 0 || types.length === 0 || !startDate || !endDate) {
      return NextResponse.json({ error: "Parâmetros incompletos" }, { status: 400 })
    }

    // Verificar acesso às congregações
    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      },
      select: { congregationId: true }
    })

    const allowedCongregationIds = userCongregations.map(uc => uc.congregationId)
    const filteredCongregationIds = congregationIds.filter(id => allowedCongregationIds.includes(id))

    if (filteredCongregationIds.length === 0) {
      return NextResponse.json({ error: "Acesso não autorizado às congregações selecionadas" }, { status: 403 })
    }

    // Converter datas para UTC usando timezone
    const startZoned = startOfDay(new Date(`${startDate}T00:00:00`))
    const endZoned = endOfDay(new Date(`${endDate}T23:59:59`))
    const startUtc = utcToZonedTime(startZoned, timezone)
    const endUtc = utcToZonedTime(endZoned, timezone)
    
    // Buscar congregações
    const congregations = await prisma.congregation.findMany({
      where: { id: { in: filteredCongregationIds } },
      orderBy: { name: 'asc' }
    })

    // Buscar lançamentos para cada congregação
    const launchesByCongregation: { [key: string]: any[] } = {}
    let totalEntrada = 0
    let totalSaida = 0

    for (const congregation of congregations) {
      const launches = await prisma.launch.findMany({
        where: {
          congregationId: congregation.id,
          type: { in: types },
          date: { gte: startUtc, lte: endUtc },
          status: { in: ['NORMAL', 'APPROVED', 'EXPORTED'] }
        },
        include: {
          contributor: true,
          supplier: true
        },
        orderBy: [{ date: 'asc'}, {type: 'asc' }]
      })

      launchesByCongregation[congregation.id] = launches

      // Calcular totais
      launches.forEach(launch => {
        if (launch.type === 'SAIDA') {
          totalSaida += launch.value || 0
        } else {
          totalEntrada += launch.value || 0
        }
      })
    }

    // Gerar PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const lineHeight = 7
    let yPos = margin

    // Função para adicionar nova página se necessário
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        return true
      }
      return false
    }

    // Cabeçalho
// --- CABEÇALHO COM LOGO ---
    // Substitua o retângulo abaixo por: doc.addImage(base64String, 'PNG', margin, yPos, 20, 20)
    doc.setFillColor(200, 200, 200)
    //doc.rect(margin, yPos, 20, 20, 'F') 
    doc.addImage(base64String, 'PNG', margin, yPos, 20, 20)
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 25, yPos + 7)
    
    doc.setFontSize(11)
    doc.text('RELAÇÃO DE LANÇAMENTOS', margin + 25, yPos + 14)
    yPos += 25

    // Informações do relatório
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    // Esquerda: Tipos e Período
   
    doc.text(`PERÍODO: ${startDate.substring(8,10)}/${startDate.substring(5,7)}/${startDate.substring(0,4)} A ${endDate.substring(8,10)}/${endDate.substring(5,7)}/${endDate.substring(0,4)}`, margin, yPos)
    yPos += 5
    const typeLabels = types.map(t => formatLaunchType(t))
    doc.text(`TIPOS: ${typeLabels.join(', ')}`, margin, yPos)
    //yPos += 5
    
    // Direita: Usuário e Data (posicionando no yPos original do bloco)
    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${session.user.name || 'N/A'}`, rightAlignX, yPos - 5, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, yPos, { align: 'right' })

    yPos += lineHeight * 1.5

    // Processar cada congregação
    for (const congregation of congregations) {
      const launches = launchesByCongregation[congregation.id] || []
      
      if (launches.length === 0) continue

      // Cabeçalho da congregação
      checkNewPage(lineHeight * 3)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`CONGREGAÇÃO: ${congregation.name}`, margin, yPos)
      yPos += lineHeight

      // doc.text(`PERÍODO: ${format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} À ${format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}`, margin, yPos)
      // yPos += lineHeight * 1.5

      // --- CABEÇALHO DA TABELA (Cor Azul Claro) ---
      checkNewPage(lineHeight * 2)
      doc.setFillColor(0, 70, 140) // Azul marinho
      doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 10, 'F')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255) // Texto Branco
      const colWidths = [25, 25, 70, 20, 30, 30]
      const colX = [margin + 2, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]]
      
      doc.text('DATA', colX[0], yPos)
      doc.text('TIPO', colX[1], yPos)
      doc.text('NOME', colX[2], yPos)
      doc.text('NRO', colX[3], yPos)
      doc.text('           VALORES R$', colX[4], yPos)
      yPos += lineHeight * 0.5
      
      // Subcabeçalhos ENTRADA e SAÍDA
      doc.setFontSize(8)
      doc.text('ENTRADA', colX[4], yPos)
      doc.text('SAÍDA', colX[5], yPos)
      //yPos += lineHeight

      yPos += 2
      doc.setTextColor(0, 0, 0) // Volta para preto

      // Linha separadora
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += lineHeight * 0.5

      // Dados dos lançamentos
      doc.setFont('helvetica', 'normal')
      let congEntrada = 0
      let congSaida = 0

      for (const launch of launches) {
        checkNewPage(lineHeight * 1.5)
        
        const launchDate = format(utcToZonedTime(launch.date, timezone), 'dd/MM/yyyy', { locale: ptBR })
        const tipo = formatLaunchType(launch.type)
        const nome = launch.contributor?.name || launch.supplier?.razaoSocial || launch.contributorName || launch.supplierName || launch.description || '-'
        const nro = launch.talonNumber || '-'
        const valor = launch.value || 0

        // Truncar nome se muito longo
        const nomeTruncado = doc.splitTextToSize(nome, colWidths[2] - 2)
        const maxLines = Math.max(1, nomeTruncado.length)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(launchDate, colX[0], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
        doc.text(tipo, colX[1], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
        
        // Nome pode ter múltiplas linhas
        let nomeY = yPos
        nomeTruncado.forEach((line: string, idx: number) => {
          doc.text(line, colX[2], nomeY)
          nomeY += lineHeight * 0.8
        })
        
        doc.text(nro, colX[3], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))

        // Formatar valor com separador de milhares
        const valorFormatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        if (launch.type === 'SAIDA') {
          doc.text('-', colX[4], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
          doc.text(`R$ ${valorFormatado}`, colX[5], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
          congSaida += valor
        } else {
          doc.text(`R$ ${valorFormatado}`, colX[4], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
          doc.text('-', colX[5], yPos + (maxLines > 1 ? lineHeight * 0.5 : 0))
          congEntrada += valor
        }

        yPos += lineHeight * maxLines
      }

      // Total da congregação
      checkNewPage(lineHeight * 2)
      //yPos += lineHeight * 0.5
      yPos += 2
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += lineHeight

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const totalEntradaFormatado = congEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const totalSaidaFormatado = congSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      doc.text('TOTAL CONGREGAÇÃO', colX[0], yPos)
      doc.text(`R$ ${totalEntradaFormatado}`, colX[4], yPos)
      doc.text(congSaida > 0 ? `R$ ${totalSaidaFormatado}` : 'R$ -', colX[5], yPos)
      yPos += lineHeight * 2
    }

    // --- TOTAL DA CONGREGAÇÃO (Cor Azul Claro) ---
    checkNewPage(lineHeight * 2)
    yPos += 2
    doc.setFillColor(230, 242, 255)
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8, 'F')

    // Total geral (se múltiplas congregações)
    if (congregations.length > 1) {
      checkNewPage(lineHeight * 3)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL GERAL DE TODAS AS CONGREGAÇÕES', margin, yPos)
      yPos += lineHeight
      const totalEntradaGeralFormatado = totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const totalSaidaGeralFormatado = totalSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      doc.text(`ENTRADA: R$ ${totalEntradaGeralFormatado}`, margin, yPos)
      yPos += lineHeight
      doc.text(`SAÍDA: R$ ${totalSaidaGeralFormatado}`, margin, yPos)
    }

    // Adicionar número da página em todas as páginas
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - margin)
    }

    // Retornar PDF
    const pdfBlob = doc.output('blob')
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_lancamentos.pdf"`
      }
    })

  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}

