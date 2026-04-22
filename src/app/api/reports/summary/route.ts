import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz'
import path from "path"
import fs from 'fs'

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
  'CARNE_AFRICA': 'Carnê África',
  'RENDA_BRUTA': 'Renda Bruta',
  'SAIDA': 'Saída'
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const prisma = await getDb(request)

  try {
    const { searchParams } = new URL(request.url)
    const summaryId = searchParams.get('summaryId')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

    if (!summaryId) {
      return NextResponse.json({ error: "ID do resumo é obrigatório" }, { status: 400 })
    }

    const summary = await prisma.congregationSummary.findUnique({
      where: { id: summaryId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        treasurerApproved: true,
        approvedByTreasury: true,
        approvedAtTreasury: true,
        accountantApproved: true,
        approvedByAccountant: true,
        approvedAtAccountant: true,
        directorApproved: true,
        approvedByDirector: true,
        approvedAtDirector: true,
        congregation: {
          select: {
            name: true
          }
        },
        Launch: {
          select: {
            date: true,
            type: true,
            value: true,
            contributorId: true,
            supplierId: true,
            contributorName: true,
            supplierName: true,
            contributor: {
              select: {
                name: true
              }
            },
            supplier: {
              select: {
                razaoSocial: true
              }
            }
          },
          orderBy: [
            { type: 'asc' },
            { date: 'asc' }
          ]
        }
      }
    })

    if (!summary) {
      return NextResponse.json({ error: "Resumo não encontrado" }, { status: 404 })
    }

    // Fetch approver users to get their photos
    const approverNames = [
      summary.approvedByTreasury,
      summary.approvedByAccountant,
      summary.approvedByDirector
    ].filter(Boolean) as string[];

    const users = await prisma.user.findMany({
      where: { name: { in: approverNames } },
      select: { name: true, image: true }
    });

    const userPhotos: Record<string, string> = {};
    users.forEach(u => {
      if (u.name && u.image) userPhotos[u.name] = u.image;
    });

    const getPhotoPath = (photo: string | null | undefined) => {
      if (!photo) return null;
      
      // Remove /api prefix if present
      let cleanPath = photo.startsWith('/api') ? photo.replace('/api', '') : photo;
      
      // Ensure it starts with uploads/
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }

      const photoPath = path.join(process.cwd(), 'public', cleanPath);
      
      if (fs.existsSync(photoPath)) {
        return photoPath;
      }
      
      console.log(`[PDF Report] Photo not found: ${photoPath} (Original: ${photo})`);
      return null;
    };

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const margin = 15
    let y = 15
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

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin, y + 15)

    doc.setFontSize(10)
    doc.text('RELATÓRIO DE RESUMO', margin, y + 20)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Congregação: ${summary.congregation?.name || 'N/A'}`, margin, y + 25)

    const rightX = pageWidth - margin
    doc.text(`Usuário: ${session.user?.name || 'N/A'}`, rightX, y + 6, { align: 'right' })
    doc.text(format(utcToZonedTime(new Date(), timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR }), rightX, y + 12, { align: 'right' })

    y += 30

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const startDate = format(utcToZonedTime(summary.startDate, timezone), 'dd/MM/yyyy', { locale: ptBR })
    //const endDate = format(utcToZonedTime(summary.endDate, timezone), 'dd/MM/yyyy', { locale: ptBR })
    doc.text(`Data: ${startDate}`, margin, y)
    y += 7
    doc.text('LANÇAMENTOS', margin, y)
    y += 2

    const cols = {
      data: margin,
      contribuinte: margin + 25,
      tipo: margin + 95,
      valor: pageWidth - margin - 5
    }

    const drawTableHeader = () => {
      doc.setFillColor(0, 51, 102)
      doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
      doc.setTextColor(255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('DATA', cols.data + 2, y + 5.5)
      doc.text('CONTRIBUINTE/FORNECEDOR', cols.contribuinte, y + 5.5)
      doc.text('TIPO', cols.tipo, y + 5.5)
      doc.text('VALOR', cols.valor, y + 5.5, { align: 'right' })
      y += 10
    }

    drawTableHeader()

    const totaisPorTipo: Record<string, number> = {}
    let totalGeral = 0

    summary.Launch.forEach((launch: any, index: number) => {
      const launchDateZoned = utcToZonedTime(launch.date, timezone)
      const launchDate = format(launchDateZoned, 'dd/MM/yyyy', { locale: ptBR })
      const contributorName = launch.contributorId ? launch.contributor?.name || launch.contributorName || '' : launch.contributorName || '---'
      const supplierName = launch.supplierId ? launch.supplier?.razaoSocial || launch.supplierName || '' : launch.supplierName || ''
      const typeLabel = typeLabels[launch.type] || launch.type
      const value = Number(launch.value)
      const valueFormatted = formatCurrency(value)

      const effectiveValue = launch.type === 'SAIDA' ? value * -1 : value
      totaisPorTipo[launch.type] = (totaisPorTipo[launch.type] || 0) + effectiveValue
      totalGeral += effectiveValue

      if (y > pageHeight - 40) {
        doc.addPage()
        y = 15
        drawTableHeader()
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(margin, y - 1, pageWidth - margin * 2, 7, 'F')
      }

      doc.setTextColor(0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      doc.text(launchDate, cols.data + 2, y + 4)

      const nameToShow = launch.type === 'SAIDA' ? supplierName : contributorName
      doc.text(nameToShow.length > 45 ? nameToShow.substring(0, 45) + '...' : nameToShow, cols.contribuinte, y + 4)

      doc.text(typeLabel, cols.tipo, y + 4)
      doc.text(valueFormatted, cols.valor, y + 4, { align: 'right' })

      y += 7
    })

    y += 3
    doc.setDrawColor(0, 51, 102)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAIS POR TIPO:', margin, y + 4)
    y += 8

    const totaisFormatados = Object.entries(totaisPorTipo).map(([tipo, valor]) => ({
      tipo,
      valor,
      valorFormatted: formatCurrency(valor),
      typeLabel: typeLabels[tipo] || tipo
    }))

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

    y += 3
    doc.setFillColor(0, 51, 102)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL GERAL:', margin + 2, y + 5.5)
    doc.text(formatCurrency(totalGeral), cols.valor, y + 5.5, { align: 'right' })

    // Seção de Aprovações
    y += 15;
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 15;
    }

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Aprovações', margin, y);
    y += 10;

    const approvals = [
      { role: 'Tesoureiro:', name: summary.approvedByTreasury, date: summary.approvedAtTreasury, approved: summary.treasurerApproved },
      { role: 'Contador:', name: summary.approvedByAccountant, date: summary.approvedAtAccountant, approved: summary.accountantApproved },
      { role: 'Dirigente:', name: summary.approvedByDirector, date: summary.approvedAtDirector, approved: summary.directorApproved },
    ];

    approvals.forEach((app) => {
      if (!app.approved || !app.name) return;

      const photo = userPhotos[app.name];
      const avatarSize = 10;
      
      // Avatar (simulado como quadrado com borda suave ou apenas imagem)
      const photoPath = getPhotoPath(photo);
      if (photoPath) {
        try {
          const photoData = fs.readFileSync(photoPath).toString('base64');
          const ext = photoPath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
          doc.addImage(photoData, ext, margin, y - 4, avatarSize, avatarSize);
        } catch (e) {
          console.error(`[PDF Report] Error adding image: ${photoPath}`, e);
          doc.setDrawColor(200);
          doc.rect(margin, y - 4, avatarSize, avatarSize);
        }
      } else {
        doc.setDrawColor(200);
        doc.rect(margin, y - 4, avatarSize, avatarSize);
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(app.role, margin + 12, y + 2);

      doc.setTextColor(0);
      doc.text(app.name, margin + 40, y + 2);

      const appDate = format(utcToZonedTime(app.date as Date, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR });
      doc.text(appDate, pageWidth - margin, y + 2, { align: 'right' });

      y += 15;
    });

    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }

    const pdfOutput = doc.output('arraybuffer');
    return new NextResponse(pdfOutput, {
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
