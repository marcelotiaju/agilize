"use client"

import { useState, useEffect } from "react"
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
import { PlayCircle, Upload, FileDown, Trash2, CheckCircle2 } from "lucide-react"

type Batch = {
    id: string
    sequentialNumber: number
    config: { name: string }
    financialEntity: { name: string }
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

    const statusMap: Record<string, { label: string, color: string }> = {
        PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-800" },
        INTEGRATED: { label: "Integrado", color: "bg-green-100 text-green-800" }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Caregando...</div>

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            <Sidebar />

            <main className="flex-1 lg:pl-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 border-b pb-2">Integração Bancária - Execução</h1>
                            {/* <p className="text-sm text-gray-500 mt-1">Importe arquivos, verifique as transformações e gere os lançamentos.</p> */}
                        </div>

                        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                            <DialogTrigger asChild>
                                <Button className="shrink-0"><Upload className="w-4 h-4 mr-2" /> Nova Importação</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nova Importação de Arquivo</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleUpload} className="grid gap-4 mt-4">
                                    <div className="grid gap-2">
                                        <Label>Configuração (Layout)</Label>
                                        <Select value={selectedConfig} onValueChange={setSelectedConfig} required>
                                            <SelectTrigger><SelectValue placeholder="Selecione a configuração desejada" /></SelectTrigger>
                                            <SelectContent>
                                                {configs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Arquivo de Origem (CSV)</Label>
                                        <Input type="file" accept=".csv, .txt" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required />
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button type="submit" disabled={uploading}>{uploading ? 'Processando...' : 'Importar'}</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card className="border-none shadow-sm shadow-[#1F2937]/10">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Número</TableHead>
                                        <TableHead>Data / Hora</TableHead>
                                        <TableHead>Configuração</TableHead>
                                        <TableHead>Entidade Financeira</TableHead>
                                        <TableHead>Registros</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batches.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhum lote importado ainda.</TableCell></TableRow>
                                    ) : batches.map(batch => {
                                        const st = statusMap[batch.status] || { label: batch.status, color: "bg-gray-100" }
                                        const isInt = batch.status === 'INTEGRATED'
                                        return (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium text-gray-900">#{batch.sequentialNumber}</TableCell>
                                                <TableCell className="text-gray-500 whitespace-nowrap">
                                                    {format(new Date(batch.importedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="text-gray-700">{batch.config.name}</TableCell>
                                                <TableCell className="text-gray-700">{batch.financialEntity.name}</TableCell>
                                                <TableCell className="text-gray-700">{batch._count.rows}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`${st.color} border-0 shadow-none hover:${st.color}`}>{st.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap space-x-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={`/api/bank-integration/execute/${batch.id}/export`} download>
                                                            <FileDown className="w-4 h-4 mr-1 text-gray-600" /> Exportar
                                                        </a>
                                                    </Button>

                                                    {!isInt && (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => handleIntegrate(batch.id)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                <PlayCircle className="w-4 h-4 mr-1" /> Integrar Lançamento
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(batch.id, isInt)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                <Trash2 className="w-4 h-4" />
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
