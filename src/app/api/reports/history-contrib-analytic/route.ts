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

interface LaunchDetail {
  date: Date;
  congregationName: string;
  type: string;
  value: number;
}

interface ContributorData {
  code: string;
  name: string;
  launches: LaunchDetail[];
  total: number;
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
        { contributor: { name: 'asc' } },
        { date: 'asc' }
      ]
    });

    // Grouping Logic - Organize by Contributor with detailed launches
    const groupedData: CongregationData[] = [];
    const contributorMap = new Map<string, { code: string, launches: LaunchDetail[], congregations: Set<string> }>();

    launches.forEach(l => {
      const contribName = l.contributor?.name || 'Não Identificado';
      const contribCode = l.contributor?.code || '';
      const congName = l.congregation.name;

      if (!contributorMap.has(contribName)) {
        contributorMap.set(contribName, {
          code: contribCode,
          launches: [],
          congregations: new Set()
        });
      }

      const entry = contributorMap.get(contribName)!;
      entry.launches.push({
        date: new Date(l.date),
        congregationName: congName,
        type: l.type,
        value: Number(l.value)
      });
      entry.congregations.add(congName);
    });

    // Convert to grouped structure with one entry per contributor
    // Group by congregations that the contributors belong to
    const congregationMapByContributor = new Map<string, ContributorData[]>();
    
    for (const [contribName, entry] of contributorMap.entries()) {
      // For each contributor, determine which congregation(s) to associate them with
      // We'll create one entry per congregation the contributor has launches in
      const congregationList = Array.from(entry.congregations).sort();
      
      for (const cong of congregationList) {
        if (!congregationMapByContributor.has(cong)) {
          congregationMapByContributor.set(cong, []);
        }
        
        // Filter launches for this specific congregation
        const congSpecificLaunches = entry.launches.filter(l => l.congregationName === cong);
        const totalValue = congSpecificLaunches.reduce((acc, l) => acc + l.value, 0);
        
        congregationMapByContributor.get(cong)!.push({
          code: entry.code,
          name: contribName,
          launches: congSpecificLaunches,
          total: totalValue
        });
      }
    }

    // Convert to final structure
    for (const [congName, contributors] of congregationMapByContributor.entries()) {
      groupedData.push({
        name: congName,
        contributors: contributors.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    groupedData.sort((a, b) => a.name.localeCompare(b.name));

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
        doc.text('HISTÓRICO DE CONTRIBUIÇÕES ANALÍTICO', margin + 25, y + 14);
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

        // AutoTable with detailed launches
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Congregação', 'Tipo de Lançamento', 'Valor']],
          body: contributor.launches.map((launch) => [
            format(utcToZonedTime(new Date(launch.date), timezone), 'dd/MM/yyyy', { locale: ptBR }),
            launch.congregationName,
            launch.type === 'DIZIMO' ? 'Dízimo' : launch.type === 'CARNE_REVIVER' ? 'Carnê Reviver' : launch.type,
            launch.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102] },
          foot: [[
            '',
            '',
            'TOTAL',
            contributor.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          ]],
          footStyles: {
            fillColor: [0, 51, 102],
            textColor: [240, 240, 240],
            fontStyle: 'bold',
            halign: 'right'
          },
          columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'left' },
            2: { halign: 'left' },
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
        'Content-Disposition': `attachment; filename="historico_contribuicoes_analitico_${year}.pdf"`
      }
    })

  } catch (error) {
    console.error("Erro ao gerar relatorio:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
