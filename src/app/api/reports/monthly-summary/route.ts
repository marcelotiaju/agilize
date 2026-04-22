import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import path from "path"
import fs from 'fs'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.canReportMonthlySummary) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const prisma = await getDb(request)
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
        ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } :
          importFilter === 'INTEGRATED' ? { equals: 'INTEGRATED' } :
            importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'INTEGRATED', 'CANCELED'] } } :
              { not: 'CANCELED' }
      }
    };

    if (congregationIds.length > 0) {
      where.congregationId = { in: congregationIds };
    }

    if (launchTypes.length > 0) {
      where.type = { in: launchTypes as any };
    }

    const monthlyData = new Array(12).fill(null).map(() => ({
      income: 0,
      expense: 0,
      total: 0
    }));

    const launches = await prisma.launch.findMany({
      where,
      select: { value: true, date: true, type: true },
      orderBy: { date: 'asc' }
    });

    launches.forEach(l => {
      const month = new Date(l.date).getUTCMonth();
      const value = Number(l.value) || 0;
      const type = l.type;
      const isExpense = type === 'SAIDA';

      if (isExpense) {
        monthlyData[month].expense += value;
      } else {
        monthlyData[month].income += value;
      }

      monthlyData[month].total = monthlyData[month].income - monthlyData[month].expense;
    });

    if (isPreview) {
      return NextResponse.json({ monthlyData })
    }

    const doc = new jsPDF()
    const monthsNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

    const margin = 10
    let y = 10
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

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
        doc.addImage(imgData, 'PNG', margin, y, printWidth, 10)
      }
    } catch {/* ignore */ }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin, y + 15)

    doc.setFontSize(11)
    doc.text('RELATÓRIO RESUMO MENSAL', margin, y + 22)
    y += 28

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    y += 2
    doc.setFontSize(10).text(`ANO: ${year}`, margin, y)
    y += 4
    doc.setFontSize(8).text(`TIPOS DE LANÇAMENTO: ${launchTypes.join(', ')}`, margin, y)
    const rightAlignX = pageWidth - margin
    doc.text(`Usuário: ${session.user?.name || 'N/A'}`, rightAlignX, y - 10, { align: 'right' })
    const now = new Date()
    doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, y - 5, { align: 'right' })

    y += 4
    doc.text(`Origem dos Lançamentos: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : importFilter === 'INTEGRATED' ? 'Integrados' : 'Apenas Digitados'}`, margin, y)
    y += 8

    const totalIncome = monthlyData.reduce((a, b) => a + b.income, 0);
    const totalExpense = monthlyData.reduce((a, b) => a + b.expense, 0);

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
      headStyles: { fillColor: [0, 51, 102], lineWidth: 0.3, lineColor: [0, 0, 0] },

      foot: [[
        { content: 'TOTAL GERAL' },
        { content: totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { content: totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { content: (totalIncome - totalExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
      ]],
      footStyles: {
        fillColor: [0, 51, 102],
        textColor: [240, 240, 240],
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
    })

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
    console.error("Erro ao gerar PDF:", error)
    return NextResponse.json({ error: "Erro ao gerar PDF" }, { status: 500 })
  }
}
