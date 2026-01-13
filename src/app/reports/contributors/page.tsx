"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, FileText, Users } from "lucide-react"
import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/layout/sidebar"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Congregation {
    id: string
    code: string
    name: string
}

interface ContributorRow {
    name: string
    position: string
    months: number[]
    total: number
}

interface CongregationPreview {
    name: string
    contributors: ContributorRow[]
    monthTotals: number[]
    grandTotal: number
}

interface PreviewData {
    congregations: CongregationPreview[]
    totalContributors: number
    totalValue: number
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export default function ReportsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [congregations, setCongregations] = useState<Congregation[]>([])
    const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [selectedLaunchTypes, setSelectedLaunchTypes] = useState<string[]>([])
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [showValues, setShowValues] = useState(true)

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

    const availableTypes = useMemo(() => {
        const types: { value: string; label: string }[] = []
        types.push({ value: 'MEMBRO', label: 'Membro' })
        types.push({ value: 'CONGREGADO', label: 'Congregado' })
        types.push({ value: 'AUXILIAR', label: 'Auxiliar' })
        types.push({ value: 'DIACONO', label: 'Diácono' })
        types.push({ value: 'PRESBITERO', label: 'Presbítero' })
        types.push({ value: 'EVANGELISTA', label: 'Evangelista' })
        types.push({ value: 'PASTOR', label: 'Pastor' })
        return types
    }, [])

    const availableLaunchTypes = useMemo(() => {
        return [
            { value: 'DIZIMO', label: 'Dízimo' },
            { value: 'CARNE_REVIVER', label: 'Carnê Reviver' }
        ]
    }, [])

    useEffect(() => {
        fetchCongregations()
    }, [])

    useEffect(() => {
        if (selectedCongregations.length > 0 && selectedTypes.length > 0 && selectedLaunchTypes.length > 0) {
            fetchPreview()
        } else {
            setPreviewData(null)
        }
    }, [selectedCongregations, selectedTypes, selectedYear, selectedLaunchTypes])

    const fetchCongregations = async () => {
        try {
            const response = await fetch('/api/congregations')
            if (response.ok) {
                const data: Congregation[] = await response.json()
                setCongregations(data)
                if (data.length === 1) {
                    setSelectedCongregations([data[0].id])
                }
            }
        } catch (error) {
            console.error('Erro ao carregar congregações:', error)
        }
    }

    const fetchPreview = async () => {
        setLoadingPreview(true)
        try {
            const params = new URLSearchParams({
                year: selectedYear,
                position: selectedTypes.join(','),
                launchTypes: selectedLaunchTypes.join(','),
                showValues: showValues.toString(),
                congregationIds: selectedCongregations.join(','),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                preview: 'true'
            })

            const response = await fetch(`/api/reports/contributors?${params.toString()}`)
            if (response.ok) {
                const data = await response.json()
                setPreviewData(data)
            }
        } catch (error) {
            console.error('Erro ao carregar prévia:', error)
        } finally {
            setLoadingPreview(false)
        }
    }

    const handleCongregationSelection = (id: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedCongregations(prev => [...prev, id])
        } else {
            setSelectedCongregations(prev => prev.filter(cId => cId !== id))
        }
    }

    const handleSelectAllCongregations = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedCongregations(congregations.map(c => c.id))
        } else {
            setSelectedCongregations([])
        }
    }

    const handleTypeSelection = (type: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedTypes(prev => [...prev, type])
        } else {
            setSelectedTypes(prev => prev.filter(t => t !== type))
        }
    }

    const handleSelectAllTypes = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedTypes(availableTypes.map(t => t.value))
        } else {
            setSelectedTypes([])
        }
    }

    const handleLaunchTypeSelection = (type: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedLaunchTypes(prev => [...prev, type])
        } else {
            setSelectedLaunchTypes(prev => prev.filter(t => t !== type))
        }
    }

    const handleSelectAllLaunchTypes = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedLaunchTypes(availableLaunchTypes.map(t => t.value))
        } else {
            setSelectedLaunchTypes([])
        }
    }

    const handleGenerateReport = async () => {
        if (selectedCongregations.length === 0) return alert("Selecione ao menos uma congregação")

        setLoading(true)
        try {
            const params = new URLSearchParams({
                year: selectedYear,
                position: selectedTypes.join(','),
                launchTypes: selectedLaunchTypes.join(','),
                showValues: showValues.toString(),
                congregationIds: selectedCongregations.join(','),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })

            const response = await fetch(`/api/reports/contributors?${params.toString()}`)
            if (!response.ok) alert("Erro ao gerar arquivo")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Relacao_Contribuintes_${selectedYear}.pdf`
            a.click()
        } catch (error) {
            console.error(error)
            alert("Falha na geração do relatório")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    if (!(session?.user as any)?.canGenerateReport) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar />
                <div className="lg:pl-64 flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6 text-center">
                            <h2 className="text-xl font-semibold text-red-600 mb-2">Acesso Negado</h2>
                            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="lg:pl-64">
                <div className="p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Relatório de Contribuintes</h1>
                        <p className="text-gray-600">Gere relatório de Contribuintes em PDF</p>
                    </div>
                    
                    {/* Filtros */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Filtros do Relatório</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>Ano de Referência</Label>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col justify-end space-y-4">
                                    <div className="flex items-center justify-between p-2 border rounded-md">
                                        <Label htmlFor="show-vals" className="cursor-pointer">Exibir Valores (R$)</Label>
                                        <Switch id="show-vals" checked={showValues} onCheckedChange={setShowValues} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Seleção de Congregações */}
                                <div>
                                    <Label>Congregações</Label>
                                    <div className="space-y-2 mt-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                        <div className="flex items-center space-x-2 pb-1 border-b">
                                            <Checkbox
                                                id="selectAllCongregations"
                                                checked={selectedCongregations.length === congregations.length && congregations.length > 0}
                                                onCheckedChange={(checked) => handleSelectAllCongregations(checked as boolean)}
                                                disabled={congregations.length === 1}
                                            />
                                            <Label htmlFor="selectAllCongregations" className="font-semibold">
                                                Marcar/Desmarcar Todos
                                            </Label>
                                        </div>
                                        {congregations.map((congregation) => (
                                            <div key={congregation.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`congregation-${congregation.id}`}
                                                    checked={selectedCongregations.includes(congregation.id)}
                                                    onCheckedChange={(checked) => handleCongregationSelection(congregation.id, checked as boolean)}
                                                    disabled={congregations.length === 1}
                                                />
                                                <Label htmlFor={`congregation-${congregation.id}`}>
                                                    {congregation.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Seleção de Tipos */}
                                <div>
                                    <Label>Cargos</Label>
                                    <div className="space-y-2 mt-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                        <div className="flex items-center space-x-2 pb-1 border-b">
                                            <Checkbox
                                                id="selectAllTypes"
                                                checked={selectedTypes.length === availableTypes.length && availableTypes.length > 0}
                                                onCheckedChange={(checked) => handleSelectAllTypes(checked as boolean)}
                                                disabled={availableTypes.length === 1}
                                            />
                                            <Label htmlFor="selectAllTypes" className="font-semibold">
                                                Marcar/Desmarcar Todos
                                            </Label>
                                        </div>
                                        {availableTypes.map((type) => (
                                            <div key={type.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`type-${type.value}`}
                                                    checked={selectedTypes.includes(type.value)}
                                                    onCheckedChange={(checked) => handleTypeSelection(type.value, checked as boolean)}
                                                    disabled={availableTypes.length === 1}
                                                />
                                                <Label htmlFor={`type-${type.value}`}>
                                                    {type.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Seleção de Tipo de Lançamento */}
                            <div>
                                <Label>Tipos de Lançamento</Label>
                                <div className="space-y-2 mt-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                    <div className="flex items-center space-x-2 pb-1 border-b">
                                        <Checkbox
                                            id="selectAllLaunchTypes"
                                            checked={selectedLaunchTypes.length === availableLaunchTypes.length && availableLaunchTypes.length > 0}
                                            onCheckedChange={(checked) => handleSelectAllLaunchTypes(checked as boolean)}
                                            disabled={availableLaunchTypes.length === 1}
                                        />
                                        <Label htmlFor="selectAllLaunchTypes" className="font-semibold">
                                            Marcar/Desmarcar Todos
                                        </Label>
                                    </div>
                                    {availableLaunchTypes.map((type) => (
                                        <div key={type.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`launchType-${type.value}`}
                                                checked={selectedLaunchTypes.includes(type.value)}
                                                onCheckedChange={(checked) => handleLaunchTypeSelection(type.value, checked as boolean)}
                                                disabled={availableLaunchTypes.length === 1}
                                            />
                                            <Label htmlFor={`launchType-${type.value}`}>
                                                {type.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prévia do Relatório */}
                    {loadingPreview ? (
                        <Card className="mb-6">
                            <CardContent className="py-12 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-2">Carregando prévia...</span>
                            </CardContent>
                        </Card>
                    ) : previewData && (
                        <Card className="mb-6">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Prévia do Relatório - {selectedYear}
                                </CardTitle>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="font-semibold">
                                        Total: {previewData.totalContributors} contribuintes
                                    </span>
                                    {showValues && (
                                        <span className="font-semibold text-green-600">
                                            R$ {formatCurrency(previewData.totalValue)}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    {previewData.congregations.map((cong, congIdx) => (
                                        <div key={congIdx} className="mb-8">
                                            <h3 className="font-bold text-lg mb-3 text-primary">
                                                {cong.name}
                                            </h3>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-primary/10">
                                                            <TableHead className="font-bold min-w-[200px]">Nome</TableHead>
                                                            <TableHead className="font-bold min-w-[100px]">Cargo</TableHead>
                                                            {MONTHS.map(month => (
                                                                <TableHead key={month} className="text-center font-bold min-w-[60px]">
                                                                    {month}
                                                                </TableHead>
                                                            ))}
                                                            <TableHead className="text-center font-bold min-w-[80px]">TOTAL</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {cong.contributors.map((contrib, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">{contrib.name}</TableCell>
                                                                <TableCell>{contrib.position}</TableCell>
                                                                {contrib.months.map((val, monthIdx) => (
                                                                    <TableCell 
                                                                        key={monthIdx} 
                                                                        className={`text-center ${val === 0 ? 'bg-yellow-100' : ''}`}
                                                                    >
                                                                        {showValues ? (val > 0 ? formatCurrency(val) : '-') : (val > 0 ? '✓' : '-')}
                                                                    </TableCell>
                                                                ))}
                                                                <TableCell className="text-center font-bold">
                                                                    {showValues ? formatCurrency(contrib.total) : (contrib.total > 0 ? '✓' : '-')}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {/* Linha de totais da congregação */}
                                                        <TableRow className="bg-gray-100 font-bold">
                                                            <TableCell colSpan={2}>TOTAL {cong.name}</TableCell>
                                                            {cong.monthTotals.map((val, monthIdx) => (
                                                                <TableCell key={monthIdx} className="text-center">
                                                                    {showValues ? formatCurrency(val) : '-'}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="text-center">
                                                                {showValues ? formatCurrency(cong.grandTotal) : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}

                    {/* Botão de Gerar PDF */}
                    <Button
                        onClick={handleGenerateReport}
                        disabled={loading || selectedCongregations.length === 0 || selectedTypes.length === 0 || selectedLaunchTypes.length === 0}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando PDF...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Gerar Relatório PDF
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
