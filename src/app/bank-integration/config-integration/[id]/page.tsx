'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Plus,
    Trash2,
    ChevronLeft,
    Save,
    Loader2,
    Settings,
    Database,
    FileType
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { TransformationEditor } from '@/components/bank-integration/TransformationEditor'
import type { TransformStep } from '@/lib/transformation-types'
import { parseTransformation } from '@/lib/transformation-types'

interface Column {
    id?: string
    code: string
    name: string
    transformation?: TransformStep | null
}

interface DBField {
    value: string
    label: string
}

interface DBFields {
    Launch: DBField[]
    Congregation: DBField[]
    Contributor: DBField[]
}

export default function ConfigDetailPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const isNew = id === 'new'

    const [isLoading, setIsLoading] = useState(!isNew)
    const [isSaving, setIsSaving] = useState(false)
    const [entities, setEntities] = useState<any[]>([])
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [dbFields, setDbFields] = useState<DBFields | null>(null)

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        financialEntityId: '',
        paymentMethodId: '',
        accountPlan: '',
        launchType: 'CREDIT',
        launchTypeSource: 'FIXED'
    })

    const [sourceColumns, setSourceColumns] = useState<Column[]>([])
    const [destinationColumns, setDestinationColumns] = useState<Column[]>([])

    const canManage = Boolean((session?.user as any)?.canManageBankIntegration)

    useEffect(() => {
        if (canManage) {
            fetchInitialData()
            if (!isNew) {
                fetchConfig()
            }
        }
    }, [canManage, id])

    const fetchInitialData = async () => {
        try {
            const [entitiesRes, methodsRes, fieldsRes] = await Promise.all([
                fetch('/api/financial-entities'),
                fetch('/api/payment-methods'),
                fetch('/api/bank-integration/config/fields')
            ])

            if (entitiesRes.ok) setEntities(await entitiesRes.json())
            if (methodsRes.ok) setPaymentMethods(await methodsRes.json())
            if (fieldsRes.ok) setDbFields(await fieldsRes.json())
        } catch (error) {
            console.error('Erro ao buscar dados iniciais:', error)
        }
    }

    const fetchConfig = async () => {
        try {
            const response = await fetch(`/api/bank-integration/config/${id}`)
            if (response.ok) {
                const data = await response.json()
                setFormData({
                    code: data.code,
                    name: data.name,
                    financialEntityId: data.financialEntityId.toString(),
                    paymentMethodId: data.paymentMethodId.toString(),
                    accountPlan: data.accountPlan || '',
                    launchType: data.launchType,
                    launchTypeSource: data.launchTypeSource || 'FIXED'
                })
                setSourceColumns(data.sourceColumns || [])
                setDestinationColumns((data.destinationColumns || []).map((col: any) => ({
                    ...col,
                    transformation: parseTransformation(col.transformation)
                })))
            }
        } catch (error) {
            console.error('Erro ao buscar configuração:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addSourceColumn = () => {
        setSourceColumns([...sourceColumns, { code: '', name: '' }])
    }

    const removeSourceColumn = (index: number) => {
        setSourceColumns(sourceColumns.filter((_, i) => i !== index))
    }

    const updateSourceColumn = (index: number, field: keyof Column, value: string) => {
        const updated = [...sourceColumns]
        updated[index] = { ...updated[index], [field]: value }
        setSourceColumns(updated)
    }

    const addDestinationColumn = () => {
        setDestinationColumns([...destinationColumns, { code: '', name: '', transformation: null }])
    }

    const removeDestinationColumn = (index: number) => {
        setDestinationColumns(destinationColumns.filter((_, i) => i !== index))
    }

    const updateDestinationColumn = (index: number, field: keyof Column, value: any) => {
        const updated = [...destinationColumns]
        updated[index] = { ...updated[index], [field]: value }
        setDestinationColumns(updated)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const method = isNew ? 'POST' : 'PUT'
            const url = isNew ? '/api/bank-integration/config' : `/api/bank-integration/config/${id}`

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    sourceColumns,
                    destinationColumns
                })
            })

            if (response.ok) {
                alert('Configuração salva com sucesso!')
                router.push('/bank-integration/config-integration')
            } else {
                const error = await response.json()
                alert(error.error || 'Erro ao salvar configuração')
            }
        } catch (error) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar configuração')
        } finally {
            setIsSaving(false)
        }
    }

    if (!canManage) return null

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            <Sidebar />

            <main className="flex-1 lg:pl-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-2 md:gap-4 w-full">
                                <Button variant="ghost" size="icon" asChild className="shrink-0">
                                    <Link href="/bank-integration/config-integration">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Link>
                                </Button>
                                <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 tracking-tight truncate">
                                    {isNew ? 'Novo Layout' : 'Editar Layout'}
                                </h1>
                            </div>
                            <Button type="submit" disabled={isSaving} className="w-full md:w-auto shadow-md">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Layout
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        ) : (
                            <Tabs defaultValue="general" className="w-full">
                                <div className="overflow-x-auto pb-2 scrollbar-none">
                                    <TabsList className="flex w-full min-w-[400px] mb-8">
                                        <TabsTrigger value="general" className="flex-1 flex items-center justify-center gap-2">
                                            <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Identificação</span><span className="sm:hidden">Geral</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="source" className="flex-1 flex items-center justify-center gap-2">
                                            <FileType className="h-4 w-4" /> <span className="hidden sm:inline">Arquivo Origem</span><span className="sm:hidden">Origem</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="destination" className="flex-1 flex items-center justify-center gap-2">
                                            <Database className="h-4 w-4" /> <span className="hidden sm:inline">Arquivo Destino</span><span className="sm:hidden">Destino</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="general">
                                    <Card className="border-none shadow-sm bg-white">
                                        <CardHeader>
                                            <CardTitle>Dados Básicos</CardTitle>
                                            <CardDescription>Defina as informações de identificação do layout.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="code">Código do Layout</Label>
                                                    <Input
                                                        id="code"
                                                        name="code"
                                                        value={formData.code}
                                                        onChange={handleInputChange}
                                                        disabled={!isNew}
                                                        placeholder="Ex: ITAU_SISPAG"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="name">Nome do Layout</Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        placeholder="Ex: Itaú Sispag Fornecedores"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="financialEntityId">Entidade Financeira</Label>
                                                    <SearchableSelect
                                                        label="Entidade Financeira"
                                                        placeholder="Selecione a entidade"
                                                        name="financialEntityId"
                                                        value={formData.financialEntityId}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, financialEntityId: val }))}
                                                        data={entities.map(e => ({ id: e.id.toString(), name: `${e.name} (${e.congregation.name})` }))}
                                                        searchKeys={['name']}
                                                        itemRenderMode="default"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="paymentMethodId">Forma de Pagamento Default</Label>
                                                    <SearchableSelect
                                                        label="Forma de Pagamento"
                                                        placeholder="Selecione a forma de pagamento"
                                                        name="paymentMethodId"
                                                        value={formData.paymentMethodId}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, paymentMethodId: val }))}
                                                        data={paymentMethods.map(m => ({ id: m.id.toString(), name: m.name }))}
                                                        searchKeys={['name']}
                                                        itemRenderMode="default"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="accountPlan">Plano de Contas Default</Label>
                                                    <Input
                                                        id="accountPlan"
                                                        name="accountPlan"
                                                        value={formData.accountPlan}
                                                        onChange={handleInputChange}
                                                        placeholder="Ex: 1.01.01"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Tipo de Lançamento Default</Label>
                                                    <Select
                                                        value={formData.launchType}
                                                        onValueChange={(val) => setFormData(prev => ({ ...prev, launchType: val }))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="CREDIT">Crédito (Entrada)</SelectItem>
                                                            <SelectItem value="DEBIT">Débito (Saída)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Origem do Tipo (Débito/Crédito)</Label>
                                                    <Select
                                                        value={formData.launchTypeSource}
                                                        onValueChange={(val) => setFormData(prev => ({ ...prev, launchTypeSource: val }))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="FIXED">Fixo no Cadastro</SelectItem>
                                                            <SelectItem value="FROM_FILE">Busca do Arquivo Origem</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="source">
                                    <Card className="border-none shadow-sm bg-white">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle>Colunas do Arquivo Origem</CardTitle>
                                                <CardDescription>Cadastre as colunas que constam no arquivo que será lido.</CardDescription>
                                            </div>
                                            <Button type="button" onClick={addSourceColumn} size="sm" variant="outline">
                                                <Plus className="mr-2 h-4 w-4" /> Adicionar Coluna
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto">
                                                <Table className="min-w-[600px] md:min-w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Código (Tag/Campo)</TableHead>
                                                            <TableHead>Nome Descritivo</TableHead>
                                                            <TableHead className="w-[80px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sourceColumns.map((col, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell>
                                                                    <Input
                                                                        value={col.code}
                                                                        onChange={(e) => updateSourceColumn(idx, 'code', e.target.value)}
                                                                        placeholder="Ex: VL_LANC"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={col.name}
                                                                        onChange={(e) => updateSourceColumn(idx, 'name', e.target.value)}
                                                                        placeholder="Ex: Valor do Lançamento"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeSourceColumn(idx)}
                                                                        className="text-red-500 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {sourceColumns.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="text-center py-10 text-gray-400">
                                                                    Nenhuma coluna cadastrada.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="destination">
                                    <Card className="border-none shadow-sm bg-white">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle>Mapeamento de Destino</CardTitle>
                                                <CardDescription>Defina como os campos de saída serão preenchidos.</CardDescription>
                                            </div>
                                            <Button type="button" onClick={addDestinationColumn} size="sm" variant="outline">
                                                <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto">
                                                <Table className="min-w-[700px] md:min-w-full">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[150px]">Campo Destino</TableHead>
                                                            <TableHead className="w-[180px]">Nome</TableHead>
                                                            <TableHead>Transformação / Ligação</TableHead>
                                                            <TableHead className="w-[60px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {destinationColumns.map((col, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell>
                                                                    <Input
                                                                        value={col.code}
                                                                        onChange={(e) => updateDestinationColumn(idx, 'code', e.target.value)}
                                                                        placeholder="Campo"
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={col.name}
                                                                        onChange={(e) => updateDestinationColumn(idx, 'name', e.target.value)}
                                                                        placeholder="Nome"
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TransformationEditor
                                                                        value={col.transformation ?? null}
                                                                        onChange={(step) => updateDestinationColumn(idx, 'transformation', step)}
                                                                        sourceColumns={sourceColumns.filter(sc => !!sc.code)}
                                                                        dbFields={dbFields ?? undefined}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeDestinationColumn(idx)}
                                                                        className="text-red-500 hover:bg-red-50 h-8 w-8"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {destinationColumns.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                                                                    Nenhum campo de destino cadastrado.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        )}
                    </form>
                </div>
            </main>
        </div>
    )
}
