import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz'
import path from "path"
import { getDb } from "@/lib/getDb"
import { numberToExtenso } from "@/lib/utils"

const fs = require('fs');

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.canGenerateReceipt) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const params = await props.params
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 })
    }

    const launch = await prisma.launch.findUnique({
      where: { id: id },
      include: {
        contributor: true,
        congregation: true
      }
    })

    if (!launch) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
    }

    if (launch.type !== 'DIZIMO') {
      return NextResponse.json({ error: "Recibo disponível apenas para dízimos" }, { status: 400 })
    }

    if (launch.status === 'CANCELED') {
      return NextResponse.json({ error: "Lançamento cancelado" }, { status: 400 })
    }

    const cargo = launch.contributor?.ecclesiasticalPosition?.toLowerCase() || ''
    if (cargo === 'membro' || cargo === 'congregado') {
      return NextResponse.json({ error: "Cargo não permitido" }, { status: 400 })
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [150, 100]
    })

    const margin = 10
    const pageWidth = doc.internal.pageSize.getWidth()
    const yStart = 10

    let logoData: string | null = null
    let logoPrintWidth = 0
    try {
      const alias = (session.user?.dbAlias) || "AGILIZE"
      let logoFileName = alias === "AGILIZE" ? "Logo.png" : "Logo_" + alias + ".png"
      let imgPath = path.join(process.cwd(), 'public', 'images', logoFileName)

      if (!fs.existsSync(imgPath)) {
        imgPath = path.join(process.cwd(), 'public', 'images', 'Logo.png')
      }

      if (fs.existsSync(imgPath)) {
        logoData = fs.readFileSync(imgPath).toString('base64')
        const imgProps = doc.getImageProperties('data:image/png;base64,' + logoData)
        const ratio = imgProps.width / imgProps.height
        logoPrintWidth = 10 * ratio
      }
    } catch { /* ignore */ }

    let y = yStart
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, y, logoPrintWidth, 10)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', pageWidth / 2 + 5, y + 15, { align: 'center' })
    doc.setFontSize(8)
    doc.text('CNPJ 13.073.051/0001-95 - RUA BAHIA, Nº 836 - ARACAJU/SE', pageWidth / 2 + 5, y + 23, { align: 'center' })

    y += 30
    doc.setFontSize(14)
    doc.text('RECIBO', pageWidth / 2, y, { align: 'center' })

    const value = launch.value || 0
    const formattedValue = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    doc.text(formattedValue, pageWidth - margin, y, { align: 'right' })

    y += 15
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)

    const contributorName = launch.contributor?.name || launch.contributorName || 'Não Informado'
    const extenso = numberToExtenso(value)

    const text = `Recebi de ${contributorName.toUpperCase()}\na quantia de ${formattedValue} (${extenso}), referente ao dízimo.`
    doc.text(text, margin, y)

    y += 20
    const launchDate = utcToZonedTime(launch.date, 'America/Sao_Paulo')
    const dateStr = `Aracaju-SE, ${format(launchDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
    doc.text(dateStr, margin, y)

    y += 10
    doc.setFontSize(9)
    doc.setTextColor(50, 50, 150)
    doc.setFont('helvetica', 'bold')
    doc.text('Arquivo gerado por', pageWidth / 2, y, { align: 'center' })
    y += 4
    doc.text((session.user?.name || 'Sistema').toUpperCase(), pageWidth / 2, y, { align: 'center' })
    y += 4
    const generationTime = utcToZonedTime(new Date(), 'America/Sao_Paulo')
    doc.text(`em ${format(generationTime, 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, y, { align: 'center' })

    await prisma.launch.update({
      where: { id: id },
      data: {
        receiptGeneratedBy: (session.user?.name || 'Sistema'),
        receiptGeneratedAt: new Date()
      }
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const fileName = `${contributorName.replace(/\s+/g, '_')}_${format(launch.date, 'dd_MM_yyyy')}.pdf`

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (error) {
    console.error("Erro ao gerar recibo:", error)
    return NextResponse.json({ error: "Erro interno ao gerar recibo" }, { status: 500 })
  }
}
