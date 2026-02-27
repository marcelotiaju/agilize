import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { Footer } from "react-day-picker"
import path from "path"

const fs = require('fs');
//const imagePath = path.join(process.cwd(), '../Logo.png');

// Cache de imagem para evitar leitura repetida
// let cachedBase64String: string | null = null;
// function getBase64Logo(): string {
//   if (!cachedBase64String) {
//     const imageFile = fs.readFileSync('../agilize/public/images/Logo.png');
//     cachedBase64String = Buffer.from(imageFile).toString('base64');
//   }
//   return cachedBase64String;
// }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.canReportMonthlySummary) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const congregationIds = searchParams.get('congregationIds')?.split(',').filter(Boolean) || []
    const launchTypes = searchParams.get('launchTypes')?.split(',').filter(Boolean) || []
    const isPreview = searchParams.get('preview') === 'true'
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
    const importFilter = searchParams.get('importFilter') || 'ALL';

    const where: any = {
      date: {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lte: new Date(`${year}-12-31T23:59:59Z`),
      },
      status: {
        ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } : importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'CANCELED'] } } : { not: 'CANCELED' }
      }
    };

    // Só filtra se o usuário selecionou congregações específicas
    if (congregationIds.length > 0) {
      where.congregationId = { in: congregationIds };
    }

    // Só filtra se o usuário selecionou tipos específicos
    if (launchTypes.length > 0) {
      where.type = { in: launchTypes as any };
    }

    // Otimização: usar groupBy do Prisma para agregação
    const launchGroups = await prisma.launch.groupBy({
      by: ['type'],
      where,
      _sum: {
        value: true
      }
    });

    // 1. Criar uma estrutura para armazenar os três valores por mês
    const monthlyData = new Array(12).fill(null).map(() => ({
      income: 0,
      expense: 0,
      total: 0
    }));

    // Buscar apenas os lançamentos necessários (com select mínimo)
    const launches = await prisma.launch.findMany({
      where,
      select: { value: true, date: true, type: true },
      orderBy: { date: 'asc' }
    });

    // 2. Preencher a estrutura iterando sobre os lançamentos 
    launches.forEach(l => {
      const month = new Date(l.date).getUTCMonth();
      const value = Number(l.value) || 0;
      const type = l.type;

      // Lógica para definir se é Entrada ou Saída
      // Adicione aqui outros tipos de saída que você utiliza no sistema
      const isExpense = type === 'SAIDA';

      if (isExpense) {
        monthlyData[month].expense += value;
      } else {
        monthlyData[month].income += value;
      }

      // O total é a diferença (Saldo)
      monthlyData[month].total = monthlyData[month].income - monthlyData[month].expense;
    });

    // const monthlyTotals = new Array(12).fill(0)
    // launches.forEach(l => {
    //   const month = new Date(l.date).getUTCMonth()
    //   monthlyTotals[month] += Number(l.value)
    // })

    // Se for apenas preview, retorna JSON
    if (isPreview) {
      return NextResponse.json({ monthlyData })
    }

    // Gerar PDF
    const doc = new jsPDF()
    const monthsNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

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
    try {
      const imgPath = path.join(process.cwd(), 'public', 'images', 'Logo.png')
      if (fs.existsSync(imgPath)) {
        const imgData = fs.readFileSync(imgPath).toString('base64')
        doc.addImage(imgData, 'PNG', margin, y, 20, 20)
      }
    } catch {/* ignore */ }
    //doc.addImage(getBase64Logo(), 'PNG', margin, y, 20, 20)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 25, y + 7)

    doc.setFontSize(11)
    doc.text('RELATÓRIO RESUMO MENSAL', margin + 25, y + 14)
    y += 25

    // Informações do relatório
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    y += 2
    // Cabeçalho da Página
    //doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 51, 102)
    //doc.text('RELAÇÃO ANUAL DE CONTRIBUINTES', 148, 15, { align: 'center' })
    doc.setFontSize(10).text(`ANO: ${year}`, margin, y)
    y += 4
    doc.setFontSize(8).text(`TIPOS DE LANÇAMENTO: ${launchTypes.join(', ')}`, margin, y)
    // Direita: Usuário e Data (posicionando no yPos original do bloco)
    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${session.user?.name || 'N/A'}`, rightAlignX, y - 5, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, y, { align: 'right' })

    y += 4
    doc.text(`Origem dos Lançamentos: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : 'Apenas Digitados'}`, margin, y)
    y += 8
    //y += lineHeight * 1.5

    //doc.setFontSize(16).text("Relatório de Resumo Mensal", 105, 20, { align: 'center' })
    //doc.setFontSize(10).text(`Ano: ${year} | Filtros: ${launchTypes.join(', ')}`, 105, 27, { align: 'center' })

    const tableData = monthsNames.map((name, i) => [
      name,
      monthlyData[i].income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', align: 'right' }),
      monthlyData[i].expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', align: 'right' }),
      monthlyData[i].total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', align: 'right' }),
    ])

    const total = monthlyData.reduce((acc, month) => acc + month.total, 0)
    const totalIncome = monthlyData.reduce((a, b) => a + b.income, 0);
    const totalExpense = monthlyData.reduce((a, b) => a + b.expense, 0);

    tableData.push([
      { content: 'TOTAL GERAL', styles: { fontStyle: 'bold' } },
      { content: totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: (totalIncome - totalExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ])

    autoTable(doc, {
      startY: 50,
      head: [
        [{ content: 'Mês', rowSpan: 2 }, { content: 'Valores', colSpan: 3, styles: { halign: 'center' } }],
        ['Entrada', 'Saída', 'Total']
      ],
      body: monthsNames.map((name, i) => [
        name,
        monthlyData[i].income.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        monthlyData[i].expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        monthlyData[i].total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102] },

      foot: [[
        { content: 'TOTAL GERAL' },
        { content: totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { content: totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { content: (totalIncome - totalExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
      ]],
      footStyles: {
        fillColor: [0, 51, 102], // Cinza claro
        textColor: [240, 240, 240],       // Preto
        fontStyle: 'bold',
        halign: 'right'             // Alinhamento à direita (opcional)
      },
      columnStyles: {
        0: { halign: 'left' },      // Mês à esquerda
        1: { halign: 'right' },     // Entradas à direita
        2: { halign: 'right' },     // Saídas à direita
        3: { halign: 'right' }      // Saldo à direita
      },
    })


    // Adicionar número da página em todas as páginas
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - margin)
    }

    return new NextResponse(doc.output('arraybuffer'), {
      headers: { 'Content-Type': 'application/pdf' }
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao gerar PDF" }, { status: 500 })
  }
}
