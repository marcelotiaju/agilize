import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { utcToZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import fs from 'fs'
import path from 'path'

const timezone = 'America/Maceio'

function formatLaunchType(type: string): string {
    const types: Record<string, string> = {
        DIZIMO: 'Dízimo',
        OFERTA_CULTO: 'Oferta do Culto',
        VOTO: 'Voto',
        EBD: 'EBD',
        CAMPANHA: 'Campanha',
        MISSAO: 'Missão',
        CIRCULO: 'Círculo de Oração',
        CARNE_REVIVER: 'Carnê Reviver',
        SAIDA: 'Saída',
    }
    return types[type] || type
}

function check(value: boolean) {
    return value ? 'SIM' : 'NÃO'
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(request.url)
    const congregationIds = searchParams.get('congregationIds')?.split(',').filter(Boolean) || []
    const types = searchParams.get('types')?.split(',').filter(Boolean) || []
    const startDateParam = searchParams.get('startDate') || ''
    const endDateParam = searchParams.get('endDate') || ''
    const importFilter = searchParams.get('importFilter') || 'ALL'
    // New filters
    const launchFilter = searchParams.get('launchFilter') || 'ALL'   // WITH | WITHOUT | ALL
    const summaryFilter = searchParams.get('summaryFilter') || 'ALL' // WITH | WITHOUT | ALL
    const directorFilter = searchParams.get('directorFilter') || 'ALL' // PENDING | APPROVED | ALL
    const preview = searchParams.get('preview') === 'true'

    if (!startDateParam || !endDateParam) {
        return NextResponse.json({ error: 'Missing dates' }, { status: 400 })
    }

    const startDate = startOfDay(new Date(startDateParam))
    const endDate = endOfDay(new Date(endDateParam))

    try {
        // Fetch selected congregations (ordered)
        const congregations = await prisma.congregation.findMany({
            where: { id: { in: congregationIds } },
            orderBy: { name: 'asc' },
        })

        // Build status filter for launches
        const statusFilter: any =
            importFilter === 'IMPORTED'
                ? { equals: 'IMPORTED' }
                : importFilter === 'MANUAL'
                    ? { notIn: ['IMPORTED', 'CANCELED'] }
                    : { not: 'CANCELED' }

        // Fetch all launches in the period for the selected congregations & types
        const launches = await prisma.launch.findMany({
            where: {
                congregationId: { in: congregationIds },
                type: types.length > 0 ? { in: types as any[] } : undefined,
                date: { gte: startDate, lte: endDate },
                status: statusFilter,
            },
            select: {
                congregationId: true,
                date: true,
                approvedByDirector: true,
                approvedAtDirector: true,
            },
        })

        // Fetch all summaries that overlap with the selected period
        const summaries = await prisma.congregationSummary.findMany({
            where: {
                congregationId: { in: congregationIds },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            select: {
                congregationId: true,
                directorApproved: true,
            },
        })

        // Build summary map (congregationId -> {count, anyDirectorApproved})
        const summaryMap = new Map<string, { count: number; anyDirectorApproved: boolean }>()
        summaries.forEach(s => {
            const existing = summaryMap.get(s.congregationId) || { count: 0, anyDirectorApproved: false }
            existing.count++
            if (s.directorApproved) existing.anyDirectorApproved = true
            summaryMap.set(s.congregationId, existing)
        })

        // Group launches by congregationId → unique dates
        type DateEntry = { date: Date; hasApprovedLaunch: boolean }
        const launchDateMap = new Map<string, DateEntry[]>()
        launches.forEach(l => {
            const dateKey = format(l.date, 'yyyy-MM-dd')
            const existing = launchDateMap.get(l.congregationId) || []
            const found = existing.find(d => format(d.date, 'yyyy-MM-dd') === dateKey)
            if (!found) {
                existing.push({ date: l.date, hasApprovedLaunch: !!l.approvedByDirector })
            } else {
                if (l.approvedByDirector) found.hasApprovedLaunch = true
            }
            launchDateMap.set(l.congregationId, existing)
        })

        // Build per-congregation data
        type AuditRow = {
            date: string | null   // formatted launch date, null when congregation has no launches
            name: string
            hasLaunch: boolean
            hasSummary: boolean
            isDirectorApproved: boolean
        }

        let rows: AuditRow[] = []
        congregations.forEach(c => {
            const dates = launchDateMap.get(c.id) || []
            const summaryData = summaryMap.get(c.id)
            const hasSummary = (summaryData?.count ?? 0) > 0
            const isSummaryApproved = summaryData?.anyDirectorApproved ?? false

            if (dates.length === 0) {
                // congregation has no launches in the period
                rows.push({ date: null, name: c.name, hasLaunch: false, hasSummary, isDirectorApproved: isSummaryApproved })
            } else {
                // one row per unique launch date, sorted ascending
                dates.sort((a, b) => a.date.getTime() - b.date.getTime())
                dates.forEach(d => {
                    rows.push({
                        date: format(d.date, 'dd/MM/yyyy'),
                        name: c.name,
                        hasLaunch: true,
                        hasSummary,
                        isDirectorApproved: isSummaryApproved || d.hasApprovedLaunch,
                    })
                })
            }
        })

        // Apply new filters
        if (launchFilter === 'WITH') rows = rows.filter(r => r.hasLaunch)
        if (launchFilter === 'WITHOUT') rows = rows.filter(r => !r.hasLaunch)
        if (summaryFilter === 'WITH') rows = rows.filter(r => r.hasSummary)
        if (summaryFilter === 'WITHOUT') rows = rows.filter(r => !r.hasSummary)
        if (directorFilter === 'APPROVED') rows = rows.filter(r => r.isDirectorApproved)
        if (directorFilter === 'PENDING') rows = rows.filter(r => !r.isDirectorApproved)

        // Totals
        const totals = {
            withLaunch: rows.filter(r => r.hasLaunch).length,
            withoutLaunch: rows.filter(r => !r.hasLaunch).length,
            withSummary: rows.filter(r => r.hasSummary).length,
            withoutSummary: rows.filter(r => !r.hasSummary).length,
            approved: rows.filter(r => r.isDirectorApproved).length,
            pending: rows.filter(r => !r.isDirectorApproved).length,
        }

        // PREVIEW (JSON)
        if (preview) {
            return NextResponse.json({ rows, totals, startDate: startDateParam, endDate: endDateParam })
        }

        // PDF GENERATION
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 15
        const lineH = 7
        let y = margin

        const checkNewPage = (space: number) => {
            if (y + space > pageHeight - margin) {
                doc.addPage()
                y = margin
                return true
            }
            return false
        }

        // Try to load logo
        try {
            const imgPath = path.join(process.cwd(), 'public', 'images', 'Logo.png')
            if (fs.existsSync(imgPath)) {
                const imgData = fs.readFileSync(imgPath).toString('base64')
                doc.addImage(imgData, 'PNG', margin, y, 20, 20)
            }
        } catch {/* ignore */ }

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('IGREJA ASSEMBLEIA DE DEUS NO ESTADO DE SERGIPE', margin + 25, y + 7)
        doc.setFontSize(11)
        doc.text('RELATÓRIO DE AUDITORIA', margin + 25, y + 15)
        y += 28

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const fmtDate = (d: string) => `${d.substring(8, 10)}/${d.substring(5, 7)}/${d.substring(0, 4)}`
        doc.text(`PERÍODO: ${fmtDate(startDateParam)} a ${fmtDate(endDateParam)}`, margin, y)
        y += 5

        if (types.length > 0) {
            doc.text(`TIPOS: ${types.map(t => formatLaunchType(t)).join(', ')}`, margin, y)
            y += 5
        }

        const now = new Date()
        doc.text(`Usuário: ${session.user?.name || 'N/A'}`, pageWidth - margin, y - 5, { align: 'right' })
        doc.text(format(utcToZonedTime(now, timezone), 'dd/MM/yyyy HH:mm', { locale: ptBR }), pageWidth - margin, y, { align: 'right' })
        y += lineH

        // Table header
        checkNewPage(lineH * 2)
        // columns: Data | Congregação | Lançamento | Resumo | Apr. Dirigente
        const colX = [margin, margin + 40, margin + 100, margin + 128, margin + 152]
        const colW = [38, 58, 26, 22, 26]

        doc.setFillColor(0, 70, 140)
        doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('DATA', colX[0], y)
        doc.text('CONGREGAÇÃO', colX[1], y)
        doc.text('LANÇAMENTO', colX[2], y)
        doc.text('RESUMO', colX[3], y)
        doc.text('APROVADO DIR.', colX[4], y)
        y += lineH

        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')

        rows.forEach((row, i) => {
            checkNewPage(lineH + 2)
            if (i % 2 === 0) {
                doc.setFillColor(245, 245, 245)
                doc.rect(margin, y - 5, pageWidth - margin * 2, lineH, 'F')
            }
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(row.date || '—', colX[0], y)
            const nameTrunc = doc.splitTextToSize(row.name, colW[1] - 2)
            doc.text(nameTrunc[0], colX[1], y)
            doc.text(row.hasLaunch ? 'SIM' : 'NÃO', colX[2], y)
            doc.text(row.hasSummary ? 'SIM' : 'NÃO', colX[3], y)
            doc.text(row.isDirectorApproved ? 'SIM' : 'NÃO', colX[4], y)
            y += lineH
        })

        // Totals section
        y += 4
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(`Total de congregações: ${rows.length}`, margin, y)
        y += lineH
        doc.text(`Com lançamento: ${totals.withLaunch}  |  Sem lançamento: ${totals.withoutLaunch}`, margin, y)
        y += lineH
        doc.text(`Com resumo: ${totals.withSummary}  |  Sem resumo: ${totals.withoutSummary}`, margin, y)
        y += lineH
        doc.text(`Aprovado dirigente: ${totals.approved}  |  Pendente: ${totals.pending}`, margin, y)

        // Page numbers
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - margin, { align: 'right' })
        }

        const pdfBlob = doc.output('blob')
        return new NextResponse(pdfBlob, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="relatorio_auditoria.pdf"',
            },
        })
    } catch (error) {
        console.error('Audit report error:', error)
        return new NextResponse('Error generating report', { status: 500 })
    }
}