"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayCircle, Upload, FileDown, Trash2, CheckCircle2, Eye, AlertCircle, ScrollText, History } from "lucide-react"

type Batch = {
    id: string
    sequentialNumber: number
    config: {
        name: string
        sourceColumns?: { id: string, code: string, name: string }[]
        destinationColumns?: { id: string, code: string, name: string }[]
        paymentMethodId?: number
        accountPlan?: string
    }
    financialEntity: { name: string, congregationId?: string }
    importedByUser: { name: string }
    importedAt: string
    status: string
    _count: { rows: number }
    rows?: any[]
    integratedLaunches?: any[]
}

export default function ExecuteIntegrationPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [classifications, setClassifications] = useState<any[]>([])
    // Função auxiliar para extrair valor numérico
    const extractNumericValue = (raw: any): number => {
        if (!raw && raw !== 0) return 0
        let s = String(raw).trim().replace('R$', '').replace(/\s/g, '')
        if (!s) return 0
        
        // Brazilian/International numeric formats heuristic
        if (s.includes(',')) {
            if (s.includes('.')) s = s.replace(/\./g, '')
            s = s.replace(',', '.')
        } else if (s.includes('.')) {
            const parts = s.split('.')
            if (parts.length > 2) {
                const lastPart = parts[parts.length - 1]
                if (lastPart.length === 2 || lastPart.length === 1) {
                    const leading = parts.slice(0, -1).join('')
                    s = leading + '.' + lastPart
                } else {
                    s = s.replace(/\./g, '')
                }
            } else {
                const lastPart = parts[parts.length - 1]
                if (lastPart.length === 3) s = s.replace(/\./g, '')
            }
        }
        const numVal = parseFloat(s)
        return isNaN(numVal) ? 0 : numVal
    }

    // Função para encontrar a coluna de valores
    const findValueColumn = (columns: any[]) => {
        return columns?.find((c: any) => {
            const nk = (c.code || c.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
            const isVal = ['valor', 'value', 'vl', 'total', 'amount', 'pagamento'].some(v => nk.includes(v))
            const isIdOrCode = ['cod', 'num', 'id', 'conta', 'agencia', 'origem'].some(v => nk.includes(v))
            return isVal && !isIdOrCode
        })
    }

    // Função para validar e formatar data
    const formatDateSafely = (dateValue: any): string => {
        if (!dateValue) return "—"
        try {
            const dateStr = String(dateValue).trim()
            if (!dateStr) return "—"

            let parsedDate: Date | null = null

            // Tenta parse se já for um ISO string ou timestamp válido
            const d = new Date(dateStr)
            if (!isNaN(d.getTime())) {
                parsedDate = d
            } else {
                // Tenta parse manual para formatos dd/MM/yyyy ou dd-MM-yyyy
                const parts = dateStr.split(/[\/-]/)
                if (parts.length === 3) {
                    let day = 0, month = 0, year = 0

                    if (dateStr.includes('/')) {
                        // Formato dd/MM/yyyy
                        day = parseInt(parts[0], 10)
                        month = parseInt(parts[1], 10) - 1
                        year = parseInt(parts[2], 10)
                    } else {
                        // Formato yyyy-MM-dd ou dd-MM-yyyy
                        if (parts[0].length === 4) {
                            // yyyy-MM-dd
                            year = parseInt(parts[0], 10)
                            month = parseInt(parts[1], 10) - 1
                            day = parseInt(parts[2], 10)
                        } else {
                            // dd-MM-yyyy
                            day = parseInt(parts[0], 10)
                            month = parseInt(parts[1], 10) - 1
                            year = parseInt(parts[2], 10)
                        }
                    }

                    if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 1900) {
                        parsedDate = new Date(year, month, day)
                    }
                }
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
                return format(parsedDate, "dd/MM/yyyy", { locale: ptBR })
            }
            return "—"
        } catch {
            return "—"
        }
    }

    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)

    const [configs, setConfigs] = useState<{ id: string, name: string }[]>([])
    const [uploadOpen, setUploadOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [selectedConfig, setSelectedConfig] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [viewOpen, setViewOpen] = useState(false)
    const [viewBatchId, setViewBatchId] = useState<string | null>(null)
    const [viewRows, setViewRows] = useState<any[]>([])
    const [loadingView, setLoadingView] = useState(false)
    const [currentBatch, setCurrentBatch] = useState<Batch | null>(null)
    const [launchIntegrationRules, setLaunchIntegrationRules] = useState<any[]>([])
    const [previewData, setPreviewData] = useState<Record<string, any>>({})
    const [loadingPreview, setLoadingPreview] = useState(false)

    // Calculate dynamic headers for the view dialog
    const sourceHeaders = useMemo(() => {
        // Return codes from config to match what was saved in SourceData
        return (currentBatch?.config?.sourceColumns || []).map(c => c.code)
    }, [currentBatch])

    const destinationHeaders = useMemo(() => {
        return (currentBatch?.config?.destinationColumns || []).map(c => c.code)
    }, [currentBatch])

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
        } else if (status === "authenticated") {
            if (!(session?.user as any)?.canManageBankIntegration) {
                router.push("/dashboard")
                return
            }
            fetchBatches()
            fetchConfigs()
            fetchClassifications()
        }
    }, [status, session])

    const fetchBatches = async () => {
        try {
            const res = await fetch("/api/bank-integration/execute")
            if (res.ok) {
                setBatches(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const fetchConfigs = async () => {
        try {
            const res = await fetch("/api/bank-integration/config")
            if (res.ok) {
                setConfigs(await res.json())
            }
        } catch (error) {
            console.error(error)
        }
    }

    const fetchClassifications = async () => {
        try {
            const res = await fetch("/api/classifications")
            if (res.ok) {
                setClassifications(await res.json())
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedConfig || !selectedFile) {
            alert("Aviso: Selecione a configuração e o arquivo.")
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("configId", selectedConfig)

        try {
            const res = await fetch("/api/bank-integration/execute/import", {
                method: "POST",
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                alert(`Erro na importação: ${data.error}`)
            } else {
                alert(`Importação Concluída: Foram processados ${data.totalRows} registros (${data.validCount} válidos).`)

                setUploadOpen(false)
                setSelectedFile(null)
                setSelectedConfig("")
                fetchBatches()
            }
        } catch (error) {
            alert("Erro: Falha na comunicação com o servidor.")
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string, isIntegrated: boolean) => {
        if (isIntegrated) {
            alert("Aviso: Lotes já integrados não podem ser removidos.")
            return
        }
        if (!confirm("Tem certeza que deseja excluir esta importação e todos os seus registros?")) return

        try {
            const res = await fetch(`/api/bank-integration/execute/${id}`, { method: 'DELETE' })
            if (res.ok) fetchBatches()
            else {
                const data = await res.json()
                alert(`Erro: ${data.error || "Falha ao excluir"}`)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleIntegrate = async (id: string) => {
        if (!confirm("Deseja realizar a integração?")) return

        try {
            const res = await fetch(`/api/bank-integration/execute/${id}/integrate`, { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                alert(`Sucesso: Integração concluída. ${data.integratedCount} lançamentos criados.`)
                fetchBatches()
            } else {
                alert(`Erro: ${data.error || "Falha ao integrar"}`)
            }
        } catch (error) {
            console.error(error)
            alert("Erro: Falha na comunicação.")
        }
    }

    const handleUndo = async (id: string) => {
        if (!confirm("Deseja desfazer a integração deste lote? Todos os lançamentos criados serão EXCLUÍDOS e o lote voltará para o status Pendente. Use com cautela.")) return

        try {
            const res = await fetch(`/api/bank-integration/execute/${id}/undo`, { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                alert("Sucesso: Integração desfeita. O lote voltou ao status Pendente.")
                fetchBatches()
            } else {
                alert(`Erro: ${data.error || "Falha ao desfazer integração"}`)
            }
        } catch (error) {
            console.error(error)
            alert("Erro: Falha na comunicação.")
        }
    }

    const handleView = async (id: string) => {
        setViewBatchId(id)
        setViewOpen(true)
        setLoadingView(true)
        setViewRows([])
        setCurrentBatch(null)
        setPreviewData({})

        try {
            const res = await fetch(`/api/bank-integration/execute/${id}`)
            if (res.ok) {
                const data = await res.json()
                setCurrentBatch(data)

                // Load launch integration rules from config
                const rules = (data.config?.launchIntegrationRules || [])
                setLaunchIntegrationRules(rules)

                const parsedRows = (data.rows || []).map((r: any) => {
                    let dest = {}
                    let src = {}
                    try {
                        dest = r.destinationData ? JSON.parse(r.destinationData) : {}
                    } catch (e) { }
                    try {
                        src = r.sourceData ? JSON.parse(r.sourceData) : { raw: r.sourceData }
                    } catch (e) {
                        src = { raw: r.sourceData }
                    }
                    return {
                        _isValid: r.isValid,
                        _errorMsg: r.errorMsg,
                        _rowIndex: r.rowIndex,
                        _contributorId: r.contributorId,
                        _contributorName: r.contributorName,
                        _launchId: r.launchId,
                        _source: src,
                        _destination: dest
                    }
                }).sort((a: any, b: any) => a._rowIndex - b._rowIndex)
                setViewRows(parsedRows)

                // Auto-load preview if there are launch integration rules
                if (rules.length > 0) {
                    setLoadingPreview(true)
                    try {
                        const previewRes = await fetch(`/api/bank-integration/execute/${id}/preview`, { method: 'POST' })
                        if (previewRes.ok) {
                            const previewResult = await previewRes.json()
                            const preview: Record<string, any> = {}
                            for (const row of previewResult.rows) {
                                preview[row.rowIndex] = row.launchRuleValues
                            }
                            setPreviewData(preview)
                        }
                    } catch (e) {
                        console.error("Error loading preview:", e)
                    } finally {
                        setLoadingPreview(false)
                    }
                }
            } else {
                alert("Erro ao buscar registros.")
            }
        } catch (error) {
            console.error(error)
            alert("Erro de comunicação.")
        } finally {
            setLoadingView(false)
        }
    }

    const loadPreviewData = async () => {
        if (!viewBatchId || loadingPreview) return

        setLoadingPreview(true)
        try {
            const res = await fetch(`/api/bank-integration/execute/${viewBatchId}/preview`, { method: 'POST' })
            if (res.ok) {
                const data = await res.json()
                // Create a map of rowId -> ruleValues
                const preview: Record<string, any> = {}
                for (const row of data.rows) {
                    preview[row.rowIndex] = row.launchRuleValues
                }
                setPreviewData(preview)
            }
        } catch (error) {
            console.error("Error loading preview:", error)
        } finally {
            setLoadingPreview(false)
        }
    }

    const statusMap: Record<string, { label: string, color: string }> = {
        PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-800" },
        INTEGRATED: { label: "Integrado", color: "bg-green-100 text-green-800" }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Caregando...</div>

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            <Sidebar />

            <main className="flex-1 lg:pl-64 p-4 md:p-8">
                <style jsx global>{`
                    .fixed-table-container {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        overflow: auto;
                        position: relative;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        background: white;
                        min-height: 0; /* Importante para flex scroll */
                    }
                    .fixed-table-container table {
                        border-collapse: separate;
                        border-spacing: 0;
                        width: 100%;
                    }
                    .fixed-table-container thead th {
                        position: sticky;
                        top: 0;
                        z-index: 20;
                        background: #f9fafb;
                        border-bottom: 2px solid #e5e7eb;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    }

                    /* Scrollbar Styling */
                    .fixed-table-container::-webkit-scrollbar {
                        width: 10px;
                        height: 10px;
                    }
                    .fixed-table-container::-webkit-scrollbar-track {
                        background: #f1f1f1;
                    }
                    .fixed-table-container::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 5px;
                    }
                    .fixed-table-container::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}</style>

                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 pb-2">Integrar</h1>
                            {/* <Badge variant="outline" className="text-gray-500 font-normal">Execução</Badge> */}
                        </div>

                        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                            <DialogTrigger asChild>
                                <Button className="shrink-0 shadow-sm"><Upload className="w-4 h-4 mr-2" /> Importar Arquivo</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Módulo de Importação</DialogTitle>
                                    <CardDescription>Selecione o arquivo CSV e o layout correspondente.</CardDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpload} className="grid gap-4 mt-4">
                                    <div className="grid gap-2">
                                        <Label>Configuração (Layout)</Label>
                                        <Select value={selectedConfig} onValueChange={setSelectedConfig} required>
                                            <SelectTrigger><SelectValue placeholder="Selecione o layout" /></SelectTrigger>
                                            <SelectContent>
                                                {configs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Arquivo CSV de Origem</Label>
                                        <Input type="file" accept=".csv, .txt" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required />
                                    </div>
                                    <div className="flex justify-end mt-4 pt-4 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)} className="mr-2">Cancelar</Button>
                                        <Button type="submit" disabled={uploading}>
                                            {uploading ? 'Processando...' : 'Iniciar Importação'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold">Detelhamento do Lote #{batches.find(b => b.id === viewBatchId)?.sequentialNumber}</DialogTitle>
                                    <CardDescription>
                                        Layout: <span className="font-semibold text-gray-900">{batches.find(b => b.id === viewBatchId)?.config.name}</span>
                                    </CardDescription>
                                </DialogHeader>
                                <div className="flex-1 overflow-hidden flex flex-col">

                                    {loadingView ? (
                                        <div className="p-12 text-center text-gray-500 flex-1 flex items-center justify-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mr-3"></div>
                                            Carregando registros...
                                        </div>
                                    ) : (
                                        <Tabs defaultValue="preview" onValueChange={(value) => {
                                            if (value === 'preview' && Object.keys(previewData).length === 0 && !loadingPreview) {
                                                loadPreviewData()
                                            }
                                        }} className="flex-1 flex flex-col min-h-0 px-6 pt-4 overflow-hidden">
                                            <TabsList className="mb-4 shrink-0">
                                                <TabsTrigger value="source">Arquivo Origem</TabsTrigger>
                                                <TabsTrigger value="destination">Lanctos a Exportar</TabsTrigger>
                                                <TabsTrigger value="preview">Lanctos a Integrar</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="source" className="flex-1 flex flex-col min-h-0 mt-0">
                                                <div className="fixed-table-container">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16 text-center">#</TableHead>
                                                                {sourceHeaders.map(k => (
                                                                    <TableHead key={k} className="whitespace-nowrap px-4 py-3">
                                                                        {currentBatch?.config?.sourceColumns?.find(c => c.code === k)?.name || k}
                                                                    </TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {viewRows.filter(r => previewData[r._rowIndex]).map((row, i) => (
                                                                <TableRow key={i} className="hover:bg-gray-50">
                                                                    <TableCell className="text-center font-mono text-xs">{row._rowIndex}</TableCell>
                                                                    {sourceHeaders.map(k => {
                                                                        const valueColumn = findValueColumn(currentBatch?.config?.sourceColumns)
                                                                        const isValueCol = k === valueColumn?.code
                                                                        return (
                                                                            <TableCell key={k} className={`whitespace-nowrap font-mono text-xs px-4 ${isValueCol ? 'text-right' : ''}`}>
                                                                                {row._source?.[k] !== undefined ? String(row._source[k]) : ""}
                                                                            </TableCell>
                                                                        )
                                                                    })}
                                                                </TableRow>
                                                            ))}
                                                            {viewRows.length > 0 && (() => {
                                                                const valueColumn = findValueColumn(currentBatch?.config?.sourceColumns)
                                                                if (!valueColumn) return false
                                                                const valueColIdx = sourceHeaders.indexOf(valueColumn.code)
                                                                return valueColIdx !== -1
                                                            })() && (
                                                                    <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                                                                        <TableCell colSpan={1} className="text-right px-4 py-3">TOTAL:</TableCell>
                                                                        {sourceHeaders.map((k, idx) => {
                                                                            const valueColumn = findValueColumn(currentBatch?.config?.sourceColumns)
                                                                            if (!valueColumn) return <TableCell key={k} className="whitespace-nowrap text-sm px-4"></TableCell>

                                                                            if (k === valueColumn.code) {
                                                                                const sum = viewRows.filter(r => previewData[r._rowIndex]).reduce((acc, row) => {
                                                                                    const val = extractNumericValue(row._source?.[k])
                                                                                    return acc + val
                                                                                }, 0)
                                                                                return (
                                                                                    <TableCell key={k} className="whitespace-nowrap text-sm px-4 text-blue-600 font-bold text-right">
                                                                                        {sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                    </TableCell>
                                                                                )
                                                                            }
                                                                            return <TableCell key={k} className="whitespace-nowrap text-sm px-4"></TableCell>
                                                                        })}
                                                                    </TableRow>
                                                                )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="destination" className="flex-1 flex flex-col min-h-0 mt-0">
                                                <div className="fixed-table-container">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16 text-center">#</TableHead>
                                                                <TableHead className="w-24 text-center">Contribuinte</TableHead>
                                                                <TableHead className="w-24 text-center">Status</TableHead>
                                                                {destinationHeaders.map(k => (
                                                                    <TableHead key={k} className="whitespace-nowrap px-4 py-3">
                                                                        {currentBatch?.config?.destinationColumns?.find(c => c.code === k)?.name || k}
                                                                    </TableHead>
                                                                ))}
                                                                <TableHead>Ocorrências</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {viewRows.filter(r => r._isValid && previewData[r._rowIndex]).map((row, i) => (
                                                                <TableRow key={i} className={`hover:bg-gray-50`}>
                                                                    <TableCell className="text-center font-mono text-xs">{row._rowIndex}</TableCell>
                                                                    <TableCell className="text-center py-2 px-1">
                                                                        {row._contributorId ? (
                                                                            <Badge title={`Vínculo: ${row._contributorName}`} className="bg-blue-600">Cadastrado</Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-gray-400 border-gray-200">Não Cadastrado</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center py-2 px-1">
                                                                        {row._isValid ? (
                                                                            <Badge className="bg-green-600">OK</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-red-600">ERRO</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    {destinationHeaders.map(k => {
                                                                        const valueColumn = findValueColumn(currentBatch?.config?.destinationColumns)
                                                                        const isValueCol = k === valueColumn?.code
                                                                        return (
                                                                            <TableCell key={k} className={`whitespace-nowrap text-sm px-4 ${isValueCol ? 'text-right' : ''}`}>
                                                                                {row._destination?.[k] ? String(row._destination[k]) : <span className="text-gray-300 italic">vazio</span>}
                                                                            </TableCell>
                                                                        )
                                                                    })}
                                                                    <TableCell className="text-red-600 text-[11px] px-4 font-mono">
                                                                        {row._errorMsg}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {viewRows.length > 0 && (() => {
                                                                const valueColumn = findValueColumn(currentBatch?.config?.destinationColumns)
                                                                if (!valueColumn) return false
                                                                const valueColIdx = destinationHeaders.indexOf(valueColumn.code)
                                                                return valueColIdx !== -1
                                                            })() && (
                                                                    <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                                                                        <TableCell colSpan={3} className="text-right px-4 py-3">TOTAL:</TableCell>
                                                                        {destinationHeaders.map((k, idx) => {
                                                                            const valueColumn = findValueColumn(currentBatch?.config?.destinationColumns)
                                                                            if (!valueColumn) return <TableCell key={k} className="whitespace-nowrap text-sm px-4"></TableCell>

                                                                            if (k === valueColumn.code) {
                                                                                const sum = viewRows.filter(r => r._isValid && previewData[r._rowIndex]).reduce((acc, row) => {
                                                                                    const val = extractNumericValue(row._destination?.[k])
                                                                                    return acc + val
                                                                                }, 0)
                                                                                return (
                                                                                    <TableCell key={k} className="whitespace-nowrap text-sm px-4 text-blue-600 font-bold text-right">
                                                                                        {sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                    </TableCell>
                                                                                )
                                                                            }
                                                                            return <TableCell key={k} className="whitespace-nowrap text-sm px-4"></TableCell>
                                                                        })}
                                                                        <TableCell></TableCell>
                                                                    </TableRow>
                                                                )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 mt-0">
                                                <div className="fixed-table-container">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16 text-center">#</TableHead>
                                                                <TableHead className="w-24 text-center">Tipo</TableHead>
                                                                <TableHead className="w-40 text-center">Contribuinte</TableHead>
                                                                <TableHead className="w-28 text-center">Data</TableHead>
                                                                <TableHead className="w-32 text-right">Valor</TableHead>
                                                                <TableHead>Descrição</TableHead>
                                                                <TableHead className="w-24">Conta Contábil</TableHead>
                                                                <TableHead className="w-32">Forma de Pagamento</TableHead>
                                                                <TableHead className="w-24">Entidade</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {viewRows.filter(r => r._isValid && previewData[r._rowIndex]).map((row, i) => {
                                                                const launch = currentBatch?.integratedLaunches?.find(l => l.id === row._launchId)
                                                                const dest = row._destination || {}

                                                                const ruleVals = previewData[row._rowIndex] || {}
                                                                const findRuleVal = (keywords: string[]) => {
                                                                    for (const rule of launchIntegrationRules) {
                                                                        const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                        if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                    }
                                                                    for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                    return null
                                                                }

                                                                const dataCols = Object.keys(dest).filter(k => ['data', 'emissao', 'vencimento', 'date', 'dt'].some(d => k.toLowerCase().includes(d)))
                                                                const ruleDate = findRuleVal(['data', 'vencimento', 'emissao', 'date'])
                                                                const dataVal = launch ? formatDateSafely(launch.date) : (ruleDate ? formatDateSafely(ruleDate) : (dataCols.length > 0 ? formatDateSafely(dest[dataCols[0]]) : "—"))

                                                                const valorCols = Object.keys(dest).filter(k => ['valor', 'value', 'vl', 'total', 'amount'].some(v => k.toLowerCase().includes(v)))
                                                                const ruleValor = findRuleVal(['valor', 'total', 'quantia', 'value', 'amount'])
                                                                const valorVal = launch ? launch.value : (ruleValor !== null ? extractNumericValue(ruleValor) : (valorCols.length > 0 ? extractNumericValue(dest[valorCols[0]]) : 0))

                                                                const descCols = Object.keys(dest).filter(k => ['descricao', 'description', 'historico', 'hist', 'obs', 'nome'].some(d => k.toLowerCase().includes(d)))
                                                                const descVal = descCols.length > 0 ? dest[descCols[0]] : null

                                                                const paymentCols = Object.keys(dest).filter(k => ['pagamento', 'forma', 'payment', 'method', 'forma_pag', 'tipopag'].some(p => k.toLowerCase().includes(p)))
                                                                const paymentVal = paymentCols.length > 0 ? dest[paymentCols[0]] : null

                                                                return (
                                                                    <TableRow key={i} className={`hover:bg-gray-50 ${launch ? "bg-green-50/30" : ""}`}>
                                                                        <TableCell className="text-center font-mono text-xs">{i + 1}</TableCell>
                                                                        <TableCell className="text-start py-2 px-1">
                                                                            {(() => {
                                                                                const ruleVals = previewData[row._rowIndex] || {}
                                                                                const findRuleVal = (keywords: string[]) => {
                                                                                    for (const rule of launchIntegrationRules) {
                                                                                        const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                        if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                    }
                                                                                    for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                    return null
                                                                                }
                                                                                const typeVal = launch ? launch.type : (findRuleVal(['tipo', 'type', 'launchtype']) || 'DÍZIMO')
                                                                                return (
                                                                                    String(typeVal).substring(0, 12)
                                                                                )
                                                                            })()}
                                                                        </TableCell>
                                                                        <TableCell className="text-left py-2 px-1">
                                                                            {(() => {
                                                                                const ruleVals = previewData[row._rowIndex] || {}
                                                                                const findRuleVal = (keywords: string[]) => {
                                                                                    for (const rule of launchIntegrationRules) {
                                                                                        const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                        if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                    }
                                                                                    for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                    return null
                                                                                }
                                                                                const ruleName = findRuleVal(['nome', 'contribuinte', 'contributor', 'name'])
                                                                                const name = launch ? (launch.contributor?.name || launch.contributorName) : (row._contributorName || ruleName)
                                                                                const code = launch ? launch.contributor?.code : row._contributorId
                                                                                return name ? (
                                                                                    <div className="flex flex-col">
                                                                                        <span title={name} className={`text-xs font-semibold ${launch ? "text-green-700" : "text-gray-600"}`}>{name}</span>
                                                                                        {code && <span className="text-[10px] text-gray-400">ID: {code}</span>}
                                                                                    </div>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">Não Cadastrado</Badge>
                                                                                )
                                                                            })()}
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-mono text-xs">
                                                                            {dataVal}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-mono text-sm font-semibold text-blue-600">
                                                                            {valorVal ? valorVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "—"}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm px-4 truncate max-w-xs">
                                                                            {(() => {
                                                                                const ruleVals = previewData[row._rowIndex] || {}
                                                                                const findRuleVal = (keywords: string[]) => {
                                                                                    for (const rule of launchIntegrationRules) {
                                                                                        const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                        if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                    }
                                                                                    for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                    return null
                                                                                }
                                                                                const descFromRule = findRuleVal(['descricao', 'description', 'historico', 'hist', 'obs'])
                                                                                const desc = launch ? launch.description : descFromRule
                                                                                return desc || descVal || "—"
                                                                            })()}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm px-4">
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {(() => {
                                                                                    if (launch) return launch.classification?.shortCode || launch.classification?.name || "—"
                                                                                    const ruleVals = previewData[row._rowIndex] || {}
                                                                                    const findRuleVal = (keywords: string[]) => {
                                                                                        for (const rule of launchIntegrationRules) {
                                                                                            const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                            if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                        }
                                                                                        for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                        return null
                                                                                    }
                                                                                    const classIdFromRule = findRuleVal(['conta', 'plano', 'classification', 'idconta', 'classificationid', 'classificacao'])
                                                                                    if (classIdFromRule) {
                                                                                        const cls = classifications.find(c => c.id === classIdFromRule || c.code === classIdFromRule || c.shortCode === classIdFromRule)
                                                                                        return cls ? (cls.shortCode || cls.code || cls.description) : classIdFromRule
                                                                                    }
                                                                                    if (currentBatch?.config?.accountPlan) {
                                                                                        const cls = classifications.find(c => c.id === currentBatch.config.accountPlan)
                                                                                        return cls ? (cls.shortCode || cls.code) : currentBatch.config.accountPlan
                                                                                    }
                                                                                    return "—"
                                                                                })()}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-sm px-4">
                                                                            <Badge variant="outline" className={`text-xs ${launch ? "bg-green-100 border-green-300" : ""}`}>
                                                                                {(() => {
                                                                                    if (launch) return launch.paymentMethod?.name || "—"
                                                                                    const ruleVals = previewData[row._rowIndex] || {}
                                                                                    const findRuleVal = (keywords: string[]) => {
                                                                                        for (const rule of launchIntegrationRules) {
                                                                                            const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                            if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                        }
                                                                                        for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                        return null
                                                                                    }
                                                                                    const paymentFromRule = findRuleVal(['pagamento', 'forma', 'payment', 'method', 'formapagamento', 'paymentmethodid'])
                                                                                    return paymentFromRule || paymentVal ? String(paymentFromRule || paymentVal).substring(0, 20) : "—"
                                                                                })()}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-gray-600">
                                                                            {launch ? launch.financialEntity?.name : (currentBatch?.financialEntity?.name || "—")}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                            {viewRows.filter(r => r._isValid && previewData[r._rowIndex]).length > 0 && (
                                                                <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                                                                    <TableCell colSpan={4} className="text-right px-4 py-3">TOTAL A INTEGRAR:</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm px-4 text-blue-600 font-bold">
                                                                        {(() => {
                                                                            if (currentBatch?.status === 'INTEGRATED') {
                                                                                return (currentBatch?.integratedLaunches || []).reduce((sum, l) => sum + (l.value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                            }
                                                                            return viewRows.filter(r => r._isValid && previewData[r._rowIndex]).reduce((sum, row) => {
                                                                                const launch = currentBatch?.integratedLaunches?.find(l => l.id === row._launchId)
                                                                                const dest = row._destination || {}
                                                                                const ruleVals = previewData[row._rowIndex] || {}
                                                                                const findRuleValInternal = (keywords: string[]) => {
                                                                                    for (const rule of launchIntegrationRules) {
                                                                                        const nk = (rule.name || rule.code).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
                                                                                        if (keywords.some(k => nk.includes(k))) return ruleVals[rule.code]
                                                                                    }
                                                                                    for (const k of keywords) if (ruleVals[k]) return ruleVals[k]
                                                                                    return null
                                                                                }
                                                                                const valorCols = Object.keys(dest).filter(k => ['valor', 'value', 'vl', 'total', 'amount'].some(v => k.toLowerCase().includes(v)))
                                                                                const ruleValor = findRuleValInternal(['valor', 'total', 'quantia', 'value', 'amount'])
                                                                                const valorVal = launch ? launch.value : (ruleValor !== null ? extractNumericValue(ruleValor) : (valorCols.length > 0 ? extractNumericValue(dest[valorCols[0]]) : 0))
                                                                                return sum + (valorVal || 0)
                                                                            }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                        })()}
                                                                    </TableCell>
                                                                    <TableCell colSpan={4}></TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card className="border-none shadow-sm shadow-[#1F2937]/10 bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/80">
                                    <TableRow>
                                        <TableHead className="w-[80px] font-bold text-gray-600">Lote</TableHead>
                                        <TableHead className="font-bold text-gray-600">Importado em</TableHead>
                                        <TableHead className="font-bold text-gray-600">Layout</TableHead>
                                        <TableHead className="font-bold text-gray-600">Entidade</TableHead>
                                        <TableHead className="font-bold text-gray-600">Linhas</TableHead>
                                        <TableHead className="font-bold text-gray-600">Total (R$)</TableHead>
                                        <TableHead className="font-bold text-gray-600">Status</TableHead>
                                        <TableHead className="text-right font-bold text-gray-600">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batches.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-20 text-gray-400">Nenhum lote importado.</TableCell></TableRow>
                                    ) : batches.map(batch => {
                                        const st = statusMap[batch.status] || { label: batch.status, color: "bg-gray-100" }
                                        const isInt = batch.status === 'INTEGRATED'
                                        return (
                                            <TableRow key={batch.id} className="hover:bg-gray-50/40">
                                                <TableCell className="font-bold text-primary">#{batch.sequentialNumber}</TableCell>
                                                <TableCell className="text-gray-500 whitespace-nowrap text-sm">
                                                    {format(new Date(batch.importedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="text-gray-900 text-sm">{batch.config.name}</TableCell>
                                                <TableCell className="text-gray-600 text-sm">{batch.financialEntity.name}</TableCell>
                                                <TableCell className="text-gray-600 text-center text-sm">{batch._count.rows}</TableCell>
                                                <TableCell className="text-right text-sm font-bold text-blue-600">
                                                    {(batch.totalAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`${st.color} border-0 font-bold uppercase text-[10px] tracking-wider px-1`}>{st.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleView(batch.id)} className="h-8 text-gray-600 hover:text-primary transition-colors">
                                                        <Eye className="w-4 h-4 mr-1.5" /> Visualizar
                                                    </Button>

                                                    <Button variant="outline" size="sm" asChild className="h-8 border-gray-200 hover:border-primary hover:text-primary transition-all">
                                                        <a href={`/api/bank-integration/execute/${batch.id}/export`} download>
                                                            <FileDown className="w-4 h-4 mr-1.5" /> Exportar
                                                        </a>
                                                    </Button>

                                                    {isInt && (
                                                        <Button variant="outline" size="sm" onClick={() => handleUndo(batch.id)} className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50 font-semibold">
                                                            <History className="w-4 h-4 mr-1.5" /> Voltar
                                                        </Button>
                                                    )}

                                                    {!isInt && (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => handleIntegrate(batch.id)} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold">
                                                                <PlayCircle className="w-4 h-4 mr-1.5" /> Integrar
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(batch.id, isInt)} className="h-8 text-gray-400 hover:text-red-500 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
