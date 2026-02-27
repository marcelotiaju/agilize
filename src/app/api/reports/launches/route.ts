import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { utcToZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import path from "path"

const fs = require('fs');
//const imagePath = path.join(process.cwd(), '../Logo.png');

//const imageFile = fs.readFileSync('../agilize/public/images/Logo.png');
//const base64String = Buffer.from(imageFile).toString('base64');

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
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

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
          ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } : importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'CANCELED'] } } : { not: 'CANCELED' }
        }
      },
      include: { congregation: true, contributor: true, supplier: true },
      orderBy: [{ date: 'asc' }]
    })

    // Agrupar dados
    const launchesByCongregation = launches.reduce((acc: any, launch) => {
      if (!acc[launch.congregationId]) acc[launch.congregationId] = []
      acc[launch.congregationId].push(launch)
      return acc
    }, {})

    // Cálculo de Totais
    const stats = congregations.map(c => {
      const cLaunches = launchesByCongregation[c.id] || []
      const entrada = cLaunches.filter((l: any) => l.type !== 'SAIDA').reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)
      const saida = cLaunches.filter((l: any) => l.type === 'SAIDA').reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0)
      return { name: c.name, entrada, saida }
    })

    const totalEntrada = stats.reduce((sum, s) => sum + s.entrada, 0)
    const totalSaida = stats.reduce((sum, s) => sum + s.saida, 0)

    // RESPOSTA APENAS DE DADOS (PRÉVIA)
    if (onlyData || preview) {
      // Agrupar lançamentos por congregação para preview
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
            isEntry: l.type !== 'SAIDA'
          })),
          entrada,
          saida
        }
      })

      return NextResponse.json({
        totalEntrada,
        totalSaida,
        byCongregation: stats,
        congregations: congregationsPreview
      })
    }

    // GERAÇÃO DO PDF
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
    try {
      const imgPath = path.join(process.cwd(), 'public', 'images', 'Logo.png')
      if (fs.existsSync(imgPath)) {
        const imgData = fs.readFileSync(imgPath).toString('base64')
        doc.addImage(imgData, 'PNG', margin, yPos, 20, 20)
      }
    } catch {/* ignore */ }
    //doc.addImage(base64String, 'PNG', margin, yPos, 20, 20)

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

    doc.text(`PERÍODO: ${startDate.substring(8, 10)}/${startDate.substring(5, 7)}/${startDate.substring(0, 4)} A ${endDate.substring(8, 10)}/${endDate.substring(5, 7)}/${endDate.substring(0, 4)}`, margin, yPos)
    yPos += 5
    const typeLabels = types.map(t => formatLaunchType(t))
    doc.text(`TIPOS: ${typeLabels.join(', ')}`, margin, yPos)
    yPos += 5
    doc.text(`Origem dos Lançamentos: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : 'Apenas Digitados'}`, margin, yPos)

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
          doc.text('-', colX[4] + 8, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          doc.text(`R$ ${valorFormatado}`, colX[5] + 8, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          congSaida += valor
        } else {
          doc.text(`R$ ${valorFormatado}`, colX[4] + 8, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
          doc.text('-', colX[5] + 8, yPos + (maxLines > 1 ? lineHeight * 0.5 : 0), { align: 'right' })
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
      doc.text(`    R$ ${totalEntradaFormatado}`, colX[4] + 8, yPos, { align: 'right' })
      doc.text(congSaida > 0 ? `    R$ ${totalSaidaFormatado}` : 'R$ -', colX[5] + 8, yPos, { align: 'right' })
      yPos += lineHeight
      doc.text('SALDO CONGREGAÇÃO', colX[0], yPos)
      doc.text(`    R$ ${(Number(congEntrada) - Number(congSaida)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[5] + 8, yPos, { align: 'right' })
      yPos += lineHeight
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
      yPos += lineHeight
      doc.text(`SALDO: R$ ${(Number(totalEntrada) - Number(totalSaida)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPos)
      yPos += lineHeight
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
    return new NextResponse("Error generating report", { status: 500 })
  }
}