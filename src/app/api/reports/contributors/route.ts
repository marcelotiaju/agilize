import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const fs = require('fs');

// const { resolve } = require('path');
// const filePath = resolve(__dirname, '/images/Logo.png');   

const imageFile = fs.readFileSync('@/../public/images/Logo.png');
const base64String = Buffer.from(imageFile).toString('base64');

// Função auxiliar para formatar moeda
const formatCurrency = (val: number, showValues: boolean) => {
  if (!showValues) return val > 0 ? 'xxx' : '-'
  if (val === 0) return '-'
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '2024')
    const position = searchParams.get('position')?.split(',') || []
    const showValues = searchParams.get('showValues') === 'true'
    const congregationIds = searchParams.get('congregationIds')?.split(',') || []
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    // 1. Buscamos todas as congregações selecionadas para garantir que todas apareçam
    const selectedCongs = await prisma.congregation.findMany({
      where: { id: { in: congregationIds } },
      orderBy: { name: 'asc' }
    })

    // 1. Buscar contribuintes e seus lançamentos no ano
    const contributors = await prisma.contributor.findMany({
      where: {
        congregationId: { in: congregationIds },
        ecclesiasticalPosition: { in: position }
      },
      include: {
        Launch: {
          where: {
            date: {
              gte: new Date(`${year}-01-01T00:00:00Z`),
              lte: new Date(`${year}-12-31T23:59:59Z`)
            },
            type: { in: ['DIZIMO', 'CARNE_REVIVER'] },
          }
        }
      },
      orderBy: [
        { ecclesiasticalPosition: 'asc' },
        { name: 'asc' }
      ]
    })

    // Agrupar por congregação para quebra de layout
    // const groupedByCongregation: any = {}
    // contributors.forEach(c => {
    //   const congName = c.congregation?.name || 'NÃO INFORMADA'
    //   if (!groupedByCongregation[congName]) groupedByCongregation[congName] = []
    //   groupedByCongregation[congName].push(c)
    // })

    // 2. Agrupar dados por Contribuinte [ID] -> [Meses 0-11]
    // const dataMap: any = {}
    // launches.forEach(l => {
    //   const cId = l.contributorId || `anon-${l.contributorName}`
    //   const month = new Date(l.date).getUTCMonth()

    //   if (!dataMap[cId]) {
    //     dataMap[cId] = {
    //       name: l.contributor?.name || l.contributorName || "NÃO IDENTIFICADO",
    //       position: l.contributor?.position || "OUTROS",
    //       months: new Array(12).fill(0),
    //       total: 0
    //     }
    //   }
    //   dataMap[cId].months[month] += Number(l.value)
    //   dataMap[cId].total += Number(l.value)
    // })

    // 2. Agrupamento hierárquico: Congregação -> Contribuinte -> Meses
    // const grouped: any = {}
    // launches.forEach(l => {
    //   const congName = l.congregation.name
    //   const cId = l.contributorId || `anon-${l.contributorName}`
    //   const month = new Date(l.date).getUTCMonth()

    //   if (!grouped[congName]) grouped[congName] = {}
    //   if (!grouped[congName][cId]) {
    //     grouped[congName][cId] = {
    //       name: l.contributor?.name || l.contributorName || "NÃO IDENTIFICADO",
    //       position: l.contributor?.ecclesiasticalPosition || "MEMBRO",
    //       months: new Array(12).fill(0),
    //       total: 0
    //     }
    //   }
    //   grouped[congName][cId].months[month] += Number(l.value)
    //   grouped[congName][cId].total += Number(l.value)
    // })

    // 3. Ordenar por Cargo e Nome
    // const sortedData = Object.values(dataMap).sort((a: any, b: any) => {
    //   if (a.position < b.position) return -1
    //   if (a.position > b.position) return 1
    //   return a.name.localeCompare(b.name)
    // })

    // 4. Iniciar PDF (Paisagem)
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
    const margin = 10
    let y = 10
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const lineHeight = 7

    // Cabeçalho
    // --- CABEÇALHO COM LOGO ---
    // Substitua o retângulo abaixo por: doc.addImage(base64String, 'PNG', margin, yPos, 20, 20)
    doc.setFillColor(200, 200, 200)
    //doc.rect(margin, yPos, 20, 20, 'F') 
    doc.addImage(base64String, 'PNG', margin, y, 20, 20)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 25, y + 7)

    doc.setFontSize(11)
    doc.text('RELAÇÃO DE CONTRIBUINTES', margin + 25, y + 14)
    y += 25

    // Informações do relatório
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    y += 2
    // Cabeçalho da Página
    //doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 51, 102)
    //doc.text('RELAÇÃO ANUAL DE CONTRIBUINTES', 148, 15, { align: 'center' })
    doc.setFontSize(10).text(`ANO: ${year} | FILTRO: ${position}`, margin, y)

    // Direita: Usuário e Data (posicionando no yPos original do bloco)
    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${session.user.name || 'N/A'}`, rightAlignX, y - 5, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, y, { align: 'right' })

    y += lineHeight * 1.5

    // Definição de Colunas
    const cols = {
      nome: margin,
      cargo: 75,
      meses: 110, // Início da grade de meses
      widthMes: 13,
      total: 270
    }

    // Função para desenhar cabeçalho da tabela
    // const drawHeader = () => {
    //   doc.setFillColor(0, 51, 102).rect(margin, y, 277, 8, 'F')
    //   doc.setTextColor(255, 255, 255).setFontSize(7).setFont('helvetica', 'bold')
    //   doc.text('NOME DO CONTRIBUINTE', cols.nome + 2, y + 5.5)
    //   doc.text('CARGO', cols.cargo + 2, y + 5.5)

    //   const mesesAbv = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
    //   mesesAbv.forEach((m, i) => doc.text(m, cols.meses + (i * cols.widthMes) + 3, y + 5.5))
    //   doc.text('TOTAL', cols.total + 1, y + 5.5)
    //   y += 8
    // }

    // drawHeader()

    const drawTableHeader = (congName: string) => {
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 51, 102)
      doc.text(`CONGREGAÇÃO: ${congName}`, margin, y)
      y += 5

      doc.setFillColor(0, 51, 102).rect(margin, y, 277, 8, 'F')
      doc.setTextColor(255).setFontSize(7)
      doc.text('NOME', margin + 2, y + 5.5)
      doc.text('CARGO', margin + 62, y + 5.5)
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
      meses.forEach((m, i) => doc.text(m, cols.meses + (i * cols.widthMes) + 3, y + 5.5))
      doc.text('TOTAL', 272, y + 5.5)
      y += 8
    }

    // 4. Renderização por congregação
    for (const cong of selectedCongs) {
      if (y > 170) { doc.addPage(); y = 15 }
      drawTableHeader(cong.name)

      // Filtramos os contribuintes desta congregação específica
      const congContributors = contributors.filter(c => c.congregationId === cong.id)

      if (congContributors.length === 0) {
        doc.setFont('helvetica', 'italic').setTextColor(100)
        doc.text('Nenhum contribuinte encontrado para os filtros selecionados.', margin + 2, y + 5)
        y += 15
        continue
      }

      // const contribuintes = groupedByCongregation[congName].sort((a: any, b: any) => {
      //   if (a.ecclesiasticalPosition !== b.ecclesiasticalPosition) return a.ecclesiasticalPosition.localeCompare(b.ecclesiasticalPosition)
      //   return a.name.localeCompare(b.name)
      // })

      // 5. Listar Dados
      const totaisMensais = new Array(12).fill(0)
      let totalGeralCong = 0
      

      congContributors.forEach((row: any) => {
        if (y > 185) { doc.addPage(); y = 20; drawTableHeader(cong.name) }

        doc.setTextColor(0).setFont('helvetica', 'normal').setFontSize(7)

        // Zebra/Linha
        doc.setDrawColor(230).line(margin, y + 6, margin + 277, y + 6)

        doc.text(row.name.substring(0, 40), cols.nome + 2, y + 4)
        doc.text(row.ecclesiasticalPosition, cols.cargo + 2, y + 4)

        let totalAnualRow = 0
        const monthsData = new Array(12).fill(0)

        // Mapear lançamentos para os meses (Janeiro é 0)
        row.Launch.forEach((l: any) => {
          const m = new Date(l.date).getUTCMonth()
          monthsData[m] += Number(l.value)
        })

        monthsData.forEach((val: number, i: number) => {
          const xCell = cols.meses + (i * cols.widthMes)

          // Regra Amarela: Mês passado, mesmo ano, valor zero
          if (year === currentYear && i < currentMonth && val === 0) {
            doc.setFillColor(255, 255, 180).rect(xCell, y, cols.widthMes, 6, 'F')
          }

          const txt = formatCurrency(val, showValues)

          const displayVal = val > 0 ? (txt) : '-'
          doc.text(displayVal, xCell + (cols.widthMes / 2), y + 4, { align: 'right' })
          totaisMensais[i] += val
          totalAnualRow += val
        })

        doc.setFont('helvetica', 'bold')
        doc.text(totalAnualRow > 0 ? formatCurrency(totalAnualRow, showValues) : '-', cols.total + (cols.widthMes / 2), y + 4, { align: 'right' })
        totalGeralCong += totalAnualRow
        y += 6
      })

      // 6. Rodapé da Tabela (Totais por Mês)
      // doc.setFillColor(240, 240, 240).rect(margin, y, 277, 8, 'F')
      // doc.setFontSize(7).setTextColor(0).text('TOTAIS MENSAIS', cols.nome + 2, y + 5.5)

      // totaisMensais.forEach((t, i) => {
      //   const txt = showValues ? t.toFixed(0) : 'xxx'
      //   doc.text(txt, cols.meses + (i * cols.widthMes) + (cols.widthMes / 2), y + 5.5, { align: 'center' })
      // })
      // Rodapé da Congregação (Totais)
      doc.setFillColor(240, 240, 240).rect(margin, y, 277, 7, 'F')
      doc.setFont('helvetica', 'bold').text('TOTAL MENSAL', margin + 2, y + 5)
      totaisMensais.forEach((t, i) => {
        const valTxt = formatCurrency(t, showValues)
        doc.text(valTxt, cols.meses + (cols.widthMes / 2), y + 5, { align: 'right' })
      })
      doc.text(formatCurrency(totalGeralCong, showValues), 276, y + 5, { align: 'right' })

      y += 15
    
    }

    // Adicionar número da página em todas as páginas
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - margin)
    }

    const pdfBlob = doc.output('blob')
    return new NextResponse(pdfBlob, {
      headers: { 'Content-Type': 'application/pdf' }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}