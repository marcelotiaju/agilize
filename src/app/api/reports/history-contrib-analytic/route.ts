import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz'

const fs = require('fs');

const imageFile = fs.readFileSync('../agilize/public/images/Logo.png');
const base64String = Buffer.from(imageFile).toString('base64');

interface MonthlyData {
  dizimo: number;
  carne_reviver: number;
  total: number;
}

interface ContributorData {
  code: string;
  name: string;
  monthlyData: MonthlyData[];
}

interface CongregationData {
  name: string;
  contributors: ContributorData[];
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

// Keep GET for backward compatibility or simple links if needed, but primary logic is shared
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.canReportMonthlySummary) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Determine input source (GET params or POST body)
    let year: number;
    let congregationIds: string[] = [];
    let contributorIds: string[] = [];
    let launchTypes: string[] = [];
    let isPreview: boolean = false;
    let timezone: string = 'America/Sao_Paulo';
    let importFilter: string = 'ALL';

    if (request.method === 'POST') {
      const body = await request.json();
      year = parseInt(body.year || new Date().getFullYear().toString());
      congregationIds = Array.isArray(body.congregations) ? body.congregations : body.congregations?.split(',').filter(Boolean) || [];
      contributorIds = Array.isArray(body.contributors) ? body.contributors : body.contributors?.split(',').filter(Boolean) || [];
      launchTypes = Array.isArray(body.launchTypes) ? body.launchTypes : body.launchTypes?.split(',').filter(Boolean) || [];
      isPreview = body.preview === true || body.preview === 'true';
      timezone = body.timezone || 'America/Sao_Paulo';
      importFilter = body.importFilter || 'ALL';
    } else {
      const { searchParams } = new URL(request.url)
      year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
      congregationIds = searchParams.get('congregations')?.split(',').filter(Boolean) || []
      contributorIds = searchParams.get('contributors')?.split(',').filter(Boolean) || []
      launchTypes = searchParams.get('launchTypes')?.split(',').filter(Boolean) || []
      isPreview = searchParams.get('preview') === 'true'
      timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
      importFilter = searchParams.get('importFilter') || 'ALL'
    }

    const where: any = {
      date: {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lte: new Date(`${year}-12-31T23:59:59Z`),
      },
      status: {
        ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } : importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'CANCELED'] } } : { not: 'CANCELED' }
      }
    };

    if (contributorIds.length > 0) {
      where.contributorId = { in: contributorIds };
      // Note: We intentionally do NOT filter by congregationId here if contributors are selected,
      // to support "fetch data across all congregations" requirement.
    } else if (congregationIds.length > 0) {
      where.congregationId = { in: congregationIds };
    }

    if (launchTypes.length > 0) {
      where.type = { in: launchTypes as any };
    }

    const launches = await prisma.launch.findMany({
      where,
      select: {
        value: true,
        date: true,
        type: true,
        congregation: { select: { name: true } },
        contributor: { select: { name: true, code: true } }
      },
      orderBy: [
        { congregation: { name: 'asc' } },
        { contributor: { name: 'asc' } },
        { date: 'asc' }
      ]
    });

    // Grouping Logic
    const groupedData: CongregationData[] = [];
    const congregationMap = new Map<string, Map<string, { data: MonthlyData[], code: string }>>();

    launches.forEach(l => {
      const congName = l.congregation.name;
      const contribName = l.contributor?.name || 'Não Identificado';
      const contribCode = l.contributor?.code || '';

      if (!congregationMap.has(congName)) {
        congregationMap.set(congName, new Map());
      }

      const contribMap = congregationMap.get(congName)!;

      if (!contribMap.has(contribName)) {
        // Initialize monthly data for this contributor
        contribMap.set(contribName, {
          code: contribCode,
          data: new Array(12).fill(null).map(() => ({
            dizimo: 0,
            carne_reviver: 0,
            total: 0
          }))
        });
      }

      const entry = contribMap.get(contribName)!;
      const monthlyData = entry.data;
      const month = new Date(l.date).getUTCMonth();
      const value = Number(l.value);

      if (l.type === 'DIZIMO') {
        monthlyData[month].dizimo += value;
      } else if (l.type === 'CARNE_REVIVER') {
        monthlyData[month].carne_reviver += value;
      }

      monthlyData[month].total = monthlyData[month].dizimo + monthlyData[month].carne_reviver;
    });

    // Convert Map to Array structure
    for (const [congName, contribMap] of congregationMap.entries()) {
      const contributors: ContributorData[] = [];
      for (const [contribName, entry] of contribMap.entries()) {
        contributors.push({
          name: contribName,
          code: entry.code,
          monthlyData: entry.data
        });
      }
      groupedData.push({
        name: congName,
        contributors
      });
    }

    if (isPreview) {
      return NextResponse.json({
        congregations: groupedData
      });
    }

    // PDF Generation
    const doc = new jsPDF();
    const monthsNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let isFirstPage = true;

    groupedData.forEach(congregation => {
      congregation.contributors.forEach(contributor => {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        let y = 10;

        // Header
        doc.setFillColor(200, 200, 200);
        doc.addImage(base64String, 'PNG', margin, y, 20, 20);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 25, y + 7);

        doc.setFontSize(11);
        doc.text('HISTÓRICO DE CONTRIBUIÇÕES SINTÉTICO', margin + 25, y + 14);
        y += 25;

        // Report Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        doc.text(`ANO: ${year}`, margin, y);
        y += 4;
        doc.setFontSize(8).text(`TIPOS: ${launchTypes.join(', ')}`, margin, y);

        const rightAlignX = pageWidth - margin;
        doc.text(`Usuário: ${session.user?.name || 'N/A'}`, rightAlignX, y - 5, { align: 'right' });
        const now = new Date();
        doc.text(` ${format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, rightAlignX, y, { align: 'right' });

        y += 4;
        doc.text(`Origem: ${importFilter === 'ALL' ? 'Todos' : importFilter === 'IMPORTED' ? 'Importados' : 'Apenas Digitados'}`, margin, y);
        y += 10;

        // Sub-header: Congregation and Contributor
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Congregação: ${congregation.name}`, margin, y);
        y += 6;
        doc.text(`Contribuinte: ${contributor.name} (${contributor.code})`, margin, y);
        y += 6;

        // AutoTable
        const totalDizimo = contributor.monthlyData.reduce((acc, curr) => acc + curr.dizimo, 0);
        const totalCarneReviver = contributor.monthlyData.reduce((acc, curr) => acc + curr.carne_reviver, 0);
        const totalGeral = totalDizimo + totalCarneReviver;

        autoTable(doc, {
          startY: y,
          head: [['Mês', 'Dízimo', 'Carnê Reviver', 'Total']],
          body: monthsNames.map((name, i) => [
            name,
            contributor.monthlyData[i].dizimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            contributor.monthlyData[i].carne_reviver.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            contributor.monthlyData[i].total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102] },
          foot: [[
            'TOTAIS',
            totalDizimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            totalCarneReviver.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
        });
      });
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - margin);
    }

    return new NextResponse(doc.output('arraybuffer'), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="historico_contribuicoes_${year}.pdf"`
      }
    })

  } catch (error) {
    console.error("Erro ao gerar relatorio:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
