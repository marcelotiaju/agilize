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
    }
    financialEntity: { name: string, congregationId?: string }
    importedByUser: { name: string }
    importedAt: string
    status: string
    _count: { rows: number }
}

export default function ExecuteIntegrationPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

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
        if (!confirm("Deseja realizar a integração? Serão criados os lançamentos correspondentes (Dízimo) sem resumo, alterando o status deste lote de importação. Esta ação não pode ser desfeita e os lançamentos não poderão ser modificados por ninguém.")) return

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

        try {
            const res = await fetch(`/api/bank-integration/execute/${id}`)
            if (res.ok) {
                const data = await res.json()
                setCurrentBatch(data)
                const parsedRows = (data.rows || []).map((r: any) => {
                    let dest = {}
                    let src = {}
                    try {
                        dest = r.destinationData ? JSON.parse(r.destinationData) : {}
                    } catch (e) {}
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
                        _source: src,
                        _destination: dest
                    }
                }).sort((a: any, b: any) => a._rowIndex - b._rowIndex)
                setViewRows(parsedRows)
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
                    .fixed-table-container .sticky-col {
                        position: sticky;
                        left: 0;
                        z-index: 10;
                        background: inherit;
                        border-right: 1px solid #e5e7eb;
                    }
                    .fixed-table-container .sticky-col-header {
                        position: sticky;
                        left: 0;
                        z-index: 30 !important;
                        background: #f9fafb !important;
                        border-right: 1px solid #e5e7eb;
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
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 border-b pb-2">Integração Bancária</h1>
                            <Badge variant="outline" className="text-gray-500 font-normal">Execução</Badge>
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
                            <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-6 overflow-hidden">
                                <DialogHeader className="mb-4">
                                    <DialogTitle className="text-2xl font-bold">Detelhamento do Lote #{batches.find(b => b.id === viewBatchId)?.sequentialNumber}</DialogTitle>
                                    <CardDescription>
                                        Layout: <span className="font-semibold text-gray-900">{batches.find(b => b.id === viewBatchId)?.config.name}</span>
                                    </CardDescription>
                                </DialogHeader>
                                
                                {loadingView ? (
                                    <div className="p-12 text-center text-gray-500 flex-1 flex items-center justify-center">
                                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mr-3"></div>
                                        Carregando registros...
                                    </div>
                                ) : (
                                    <Tabs defaultValue="destination" className="flex-1 flex flex-col min-h-0">
                                        <TabsList className="mb-4">
                                            <TabsTrigger value="source">Arquivo Origem</TabsTrigger>
                                            <TabsTrigger value="destination">Arquivo Destino (Transformado)</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="source" className="flex-1 flex flex-col min-h-0 mt-0">
                                            <div className="fixed-table-container">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 text-center sticky-col-header">#</TableHead>
                                                            {sourceHeaders.map(k => (
                                                                <TableHead key={k} className="whitespace-nowrap px-4 py-3">
                                                                    {currentBatch?.config?.sourceColumns?.find(c => c.code === k)?.name || k}
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {viewRows.map((row, i) => (
                                                            <TableRow key={i} className="hover:bg-gray-50">
                                                                <TableCell className="text-center font-mono text-xs sticky-col bg-white">{row._rowIndex}</TableCell>
                                                                {sourceHeaders.map(k => (
                                                                    <TableCell key={k} className="whitespace-nowrap font-mono text-xs px-4">
                                                                        {row._source?.[k] !== undefined ? String(row._source[k]) : ""}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="destination" className="flex-1 flex flex-col min-h-0 mt-0">
                                            <div className="fixed-table-container">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 text-center sticky-col-header">#</TableHead>
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
                                                        {viewRows.map((row, i) => (
                                                            <TableRow key={i} className={`hover:bg-gray-50 ${!row._isValid ? "bg-red-50" : ""}`}>
                                                                <TableCell className="text-center font-mono text-xs sticky-col bg-inherit">{row._rowIndex}</TableCell>
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
                                                                {destinationHeaders.map(k => (
                                                                    <TableCell key={k} className="whitespace-nowrap text-sm px-4">
                                                                        {row._destination?.[k] ? String(row._destination[k]) : <span className="text-gray-300 italic">vazio</span>}
                                                                    </TableCell>
                                                                ))}
                                                                <TableCell className="text-red-600 text-[11px] px-4 font-mono">
                                                                    {row._errorMsg}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                )}
                                <div className="mt-4 flex justify-end shrink-0">
                                    <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
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
                                        <TableHead className="font-bold text-gray-600">Status</TableHead>
                                        <TableHead className="text-right font-bold text-gray-600">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batches.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-20 text-gray-400">Nenhum lote importado.</TableCell></TableRow>
                                    ) : batches.map(batch => {
                                        const st = statusMap[batch.status] || { label: batch.status, color: "bg-gray-100" }
                                        const isInt = batch.status === 'INTEGRATED'
                                        return (
                                            <TableRow key={batch.id} className="hover:bg-gray-50/40">
                                                <TableCell className="font-bold text-primary">#{batch.sequentialNumber}</TableCell>
                                                <TableCell className="text-gray-500 whitespace-nowrap text-sm">
                                                    {format(new Date(batch.importedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="text-gray-900 font-medium">{batch.config.name}</TableCell>
                                                <TableCell className="text-gray-600 text-sm">{batch.financialEntity.name}</TableCell>
                                                <TableCell className="text-gray-600 text-sm">{batch._count.rows}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`${st.color} border-0 font-bold uppercase text-[10px] tracking-wider px-2`}>{st.label}</Badge>
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
