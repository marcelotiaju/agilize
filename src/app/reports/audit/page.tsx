"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { FileText, ArrowUp, CalendarIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Congregation {
    id: string
    code: string
    name: string
}

interface AuditRow {
    date: string | null   // formatted launch date, null = congregation has no launches
    name: string
    hasLaunch: boolean
    hasSummary: boolean
    isDirectorApproved: boolean
}

interface Totals {
    withLaunch: number
    withoutLaunch: number
    withSummary: number
    withoutSummary: number
    approved: number
    pending: number
}

interface PreviewData {
    rows: AuditRow[]
    totals: Totals
    startDate: string
    endDate: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditReport() {
    const { data: session } = useSession()

    const [congregations, setCongregations] = useState<Congregation[]>([])
    const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [endDate, setEndDate] = useState<Date>(new Date())
    const [startDateOpen, setStartDateOpen] = useState(false)
    const [endDateOpen, setEndDateOpen] = useState(false)

    // Existing filters
    const [importFilter, setImportFilter] = useState<'ALL' | 'IMPORTED' | 'MANUAL'>('MANUAL')

    // New filters
    const [launchFilter, setLaunchFilter] = useState<'ALL' | 'WITH' | 'WITHOUT'>('WITHOUT')
    const [summaryFilter, setSummaryFilter] = useState<'ALL' | 'WITH' | 'WITHOUT'>('WITHOUT')
    const [directorFilter, setDirectorFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL')

    const [loadingPreview, setLoadingPreview] = useState(false)
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
    const [showScrollTop, setShowScrollTop] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Available types from user permissions
    const availableTypes = useMemo(() => {
        const user = session?.user as any
        const types: { value: string; label: string }[] = []
        if (user?.canLaunchTithe) types.push({ value: 'DIZIMO', label: 'Dízimo' })
        if (user?.canLaunchServiceOffer) types.push({ value: 'OFERTA_CULTO', label: 'Oferta do Culto' })
        if (user?.canLaunchVote) types.push({ value: 'VOTO', label: 'Voto' })
        if (user?.canLaunchEbd) types.push({ value: 'EBD', label: 'EBD' })
        if (user?.canLaunchCampaign) types.push({ value: 'CAMPANHA', label: 'Campanha' })
        if (user?.canLaunchMission) types.push({ value: 'MISSAO', label: 'Missão' })
        if (user?.canLaunchCircle) types.push({ value: 'CIRCULO', label: 'Círculo de Oração' })
        if (user?.canLaunchCarneReviver) types.push({ value: 'CARNE_REVIVER', label: 'Carnê Reviver' })
        if (user?.canLaunchExpense) types.push({ value: 'SAIDA', label: 'Saída' })
        return types
    }, [session])

    // Auto-select when only one option
    useEffect(() => {
        if (availableTypes.length === 1 && selectedTypes.length === 0) {
            setSelectedTypes([availableTypes[0].value])
        }
    }, [availableTypes])

    useEffect(() => { fetchCongregations() }, [])

    const fetchCongregations = async () => {
        try {
            const res = await fetch('/api/congregations')
            if (res.ok) {
                const data: Congregation[] = await res.json()
                setCongregations(data)
                if (data.length === 1) setSelectedCongregations([data[0].id])
            }
        } catch (e) { console.error(e) }
    }

    // Scroll-to-top listener
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        const handler = () => setShowScrollTop(el.scrollTop > 300)
        el.addEventListener('scroll', handler)
        return () => el.removeEventListener('scroll', handler)
    }, [])

    // Preview auto-load
    const loadPreview = async () => {
        if (selectedCongregations.length === 0) { setPreviewData(null); return }
        setLoadingPreview(true)
        try {
            const params = new URLSearchParams({
                congregationIds: selectedCongregations.join(','),
                types: selectedTypes.join(','),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                importFilter,
                launchFilter,
                summaryFilter,
                directorFilter,
                preview: 'true',
            })
            const res = await fetch(`/api/reports/audit?${params}`)
            if (res.ok) setPreviewData(await res.json())
            else setPreviewData(null)
        } catch (e) {
            console.error(e)
            setPreviewData(null)
        } finally {
            setLoadingPreview(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(loadPreview, 500)
        return () => clearTimeout(t)
    }, [selectedCongregations, selectedTypes, startDate, endDate, importFilter, launchFilter, summaryFilter, directorFilter])

    // ── PDF generation ──────────────────────────────────────────────────────────
    const handleGeneratePdf = async () => {
        if (selectedCongregations.length === 0) return alert('Selecione ao menos uma congregação')
        setIsGenerating(true)
        try {
            const params = new URLSearchParams({
                congregationIds: selectedCongregations.join(','),
                types: selectedTypes.join(','),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                importFilter,
                launchFilter,
                summaryFilter,
                directorFilter,
            })
            const res = await fetch(`/api/reports/audit?${params}`)
            if (!res.ok) return alert('Erro ao gerar PDF')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Auditoria_${formatDate(startDate, 'dd-MM-yyyy')}_${formatDate(endDate, 'dd-MM-yyyy')}.pdf`
            a.click()
        } catch (e) {
            console.error(e)
            alert('Falha ao gerar PDF')
        } finally {
            setIsGenerating(false)
        }
    }

    // ── Excel export ─────────────────────────────────────────────────────────────
    const handleExportExcel = () => {
        if (!previewData) return
        setIsGeneratingExcel(true)
        try {
            const rows = previewData.rows.map(r => ({
                'Data': r.date || '—',
                'Congregação': r.name,
                'Lançamento': r.hasLaunch ? 'SIM' : 'NÃO',
                'Resumo': r.hasSummary ? 'SIM' : 'NÃO',
                'Aprovado Dirigente': r.isDirectorApproved ? 'SIM' : 'NÃO',
            }))

            // Totals row
            rows.push({} as any)
            rows.push({
                'Data': '',
                'Congregação': 'TOTAIS',
                'Lançamento': `Com: ${previewData.totals.withLaunch} | Sem: ${previewData.totals.withoutLaunch}`,
                'Resumo': `Com: ${previewData.totals.withSummary} | Sem: ${previewData.totals.withoutSummary}`,
                'Aprovado Dirigente': `Sim: ${previewData.totals.approved} | Não: ${previewData.totals.pending}`,
            })

            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = [{ wch: 26 }, { wch: 45 }, { wch: 14 }, { wch: 10 }, { wch: 20 }]
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Auditoria')
            XLSX.writeFile(wb, `Auditoria_${formatDate(startDate, 'dd-MM-yyyy')}_${formatDate(endDate, 'dd-MM-yyyy')}.xlsx`)
        } finally {
            setIsGeneratingExcel(false)
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    const StatusBadge = ({ value }: { value: boolean }) =>
        value
            ? <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="h-4 w-4" />SIM</span>
            : <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><XCircle className="h-4 w-4" />NÃO</span>

    const handleCongregationSelection = (id: string, checked: boolean) =>
        setSelectedCongregations(prev => checked ? [...prev, id] : prev.filter(c => c !== id))

    const handleSelectAllCongregations = (checked: boolean) =>
        setSelectedCongregations(checked ? congregations.map(c => c.id) : [])

    const handleTypeSelection = (type: string, checked: boolean) =>
        setSelectedTypes(prev => checked ? [...prev, type] : prev.filter(t => t !== type))

    const handleSelectAllTypes = (checked: boolean) =>
        setSelectedTypes(checked ? availableTypes.map(t => t.value) : [])

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="lg:pl-64">
                <div className="p-6" ref={scrollRef}>
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Relatório de Auditoria</h1>
                        {/* <p className="text-gray-500 text-sm mt-1">Visão consolidada por congregação — lançamentos, resumos e aprovações</p> */}
                    </div>

                    {/* ── Filter Card ─────────────────────────────────────────────────── */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Row 1: Period + origin */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Data Início</Label>
                                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formatDate(startDate, 'dd/MM/yyyy')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={startDate} locale={ptBR}
                                                onSelect={d => { if (d) { setStartDate(d); setStartDateOpen(false) } }} />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div>
                                    <Label>Data Fim</Label>
                                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formatDate(endDate, 'dd/MM/yyyy')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={endDate} locale={ptBR}
                                                onSelect={d => { if (d) { setEndDate(d); setEndDateOpen(false) } }} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Row 2: New audit filters */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div>
                                    <Label>Origem Lanc.</Label>
                                    <Select value={importFilter} onValueChange={(v: any) => setImportFilter(v)}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todos</SelectItem>
                                            <SelectItem value="IMPORTED">Apenas Importados</SelectItem>
                                            <SelectItem value="MANUAL">Apenas Digitados</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Lançamento</Label>
                                    <Select value={launchFilter} onValueChange={(v: any) => setLaunchFilter(v)}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Ambos</SelectItem>
                                            <SelectItem value="WITH">Com Lançamento</SelectItem>
                                            <SelectItem value="WITHOUT">Sem Lançamento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Resumo</Label>
                                    <Select value={summaryFilter} onValueChange={(v: any) => setSummaryFilter(v)}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Ambos</SelectItem>
                                            <SelectItem value="WITH">Com Resumo</SelectItem>
                                            <SelectItem value="WITHOUT">Sem Resumo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Aprovado Dirigente</Label>
                                    <Select value={directorFilter} onValueChange={(v: any) => setDirectorFilter(v)}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Ambos</SelectItem>
                                            <SelectItem value="APPROVED">Realizada</SelectItem>
                                            <SelectItem value="PENDING">Pendente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Row 3: Congregations + Types */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Congregações</Label>
                                    <div className="mt-1 space-y-2 border p-3 rounded-md max-h-44 overflow-y-auto">
                                        <div className="flex items-center space-x-2 pb-1 border-b">
                                            <Checkbox
                                                id="allCong"
                                                checked={selectedCongregations.length === congregations.length && congregations.length > 0}
                                                onCheckedChange={v => handleSelectAllCongregations(v as boolean)}
                                                disabled={congregations.length === 1}
                                            />
                                            <Label htmlFor="allCong" className="font-semibold cursor-pointer">Marcar/Desmarcar Todos</Label>
                                        </div>
                                        {congregations.map(c => (
                                            <div key={c.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`cong-${c.id}`}
                                                    checked={selectedCongregations.includes(c.id)}
                                                    onCheckedChange={v => handleCongregationSelection(c.id, v as boolean)}
                                                    disabled={congregations.length === 1}
                                                />
                                                <Label htmlFor={`cong-${c.id}`} className="cursor-pointer">{c.name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Tipos de Lançamento</Label>
                                    <div className="mt-1 space-y-2 border p-3 rounded-md max-h-44 overflow-y-auto">
                                        <div className="flex items-center space-x-2 pb-1 border-b">
                                            <Checkbox
                                                id="allTypes"
                                                checked={selectedTypes.length === availableTypes.length && availableTypes.length > 0}
                                                onCheckedChange={v => handleSelectAllTypes(v as boolean)}
                                                disabled={availableTypes.length === 1}
                                            />
                                            <Label htmlFor="allTypes" className="font-semibold cursor-pointer">Marcar/Desmarcar Todos</Label>
                                        </div>
                                        {availableTypes.map(t => (
                                            <div key={t.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`type-${t.value}`}
                                                    checked={selectedTypes.includes(t.value)}
                                                    onCheckedChange={v => handleTypeSelection(t.value, v as boolean)}
                                                    disabled={availableTypes.length === 1}
                                                />
                                                <Label htmlFor={`type-${t.value}`} className="cursor-pointer">{t.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Preview ─────────────────────────────────────────────────────── */}
                    {loadingPreview ? (
                        <Card className="mb-6">
                            <CardContent className="py-12 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3 text-gray-500">Carregando prévia...</span>
                            </CardContent>
                        </Card>
                    ) : previewData && (
                        <Card className="mb-6">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Prévia — {previewData.rows.length} congregação(ões)
                                </CardTitle>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <Badge variant="outline" className="text-green-700 border-green-300">
                                        Com lançamento: {previewData.totals.withLaunch}
                                    </Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                        Sem lançamento: {previewData.totals.withoutLaunch}
                                    </Badge>
                                    <Badge variant="outline" className="text-green-700 border-green-300">
                                        Com resumo: {previewData.totals.withSummary}
                                    </Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                        Sem resumo: {previewData.totals.withoutSummary}
                                    </Badge>
                                    <Badge variant="outline" className="text-green-700 border-green-300">
                                        Dir. aprovado: {previewData.totals.approved}
                                    </Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                        Dir. pendente: {previewData.totals.pending}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {previewData.rows.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Nenhuma congregação encontrada com os filtros selecionados.</p>
                                ) : (
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-primary/10">
                                                    <TableHead className="font-bold w-10">#</TableHead>
                                                    <TableHead className="font-bold whitespace-nowrap">Data</TableHead>
                                                    <TableHead className="font-bold">Congregação</TableHead>
                                                    <TableHead className="font-bold text-center">Lançamento</TableHead>
                                                    <TableHead className="font-bold text-center">Resumo</TableHead>
                                                    <TableHead className="font-bold text-center">Aprovado Dirigente</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewData.rows.map((row, i) => (
                                                    <TableRow key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/60'}>
                                                        <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-sm text-gray-600 font-medium">{row.date || <span className="text-gray-300">—</span>}</TableCell>
                                                        <TableCell className="font-medium">{row.name}</TableCell>
                                                        <TableCell className="text-center"><StatusBadge value={row.hasLaunch} /></TableCell>
                                                        <TableCell className="text-center"><StatusBadge value={row.hasSummary} /></TableCell>
                                                        <TableCell className="text-center"><StatusBadge value={row.isDirectorApproved} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Actions ─────────────────────────────────────────────────────── */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleExportExcel}
                            disabled={!previewData || previewData.rows.length === 0 || isGeneratingExcel}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="lg"
                        >
                            {isGeneratingExcel
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando Excel...</>
                                : <><FileText className="mr-2 h-4 w-4" />Gerar Excel</>}
                        </Button>
                        <Button
                            onClick={handleGeneratePdf}
                            disabled={isGenerating || selectedCongregations.length === 0}
                            className="flex-1"
                            size="lg"
                        >
                            {isGenerating
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PDF...</>
                                : <><FileText className="mr-2 h-4 w-4" />Gerar PDF</>}
                        </Button>
                    </div>
                </div>
            </div>

            {showScrollTop && (
                <Button
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-20 right-6 z-40 rounded-full w-12 h-12 shadow-2xl bg-blue-700"
                    size="icon"
                >
                    <ArrowUp className="h-6 w-6 text-white" />
                </Button>
            )}
        </div>
    )
}