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

    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    //const [showValues, setShowValues] = useState(true)
    //const [contributionFilter, setContributionFilter] = useState('BOTH') // BOTH, WITH_LAUNCH, WITHOUT_LAUNCH

    //const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

    const fetchAvailableYears = async () => {
        try {
            const response = await fetch('/api/reports/available-years')
            if (response.ok) {
                const years: string[] = await response.json()
                setAvailableYears(years)
                
                // Define o ano mais recente (primeiro do array) como default
                if (years.length > 0 && !selectedYear) {
                    setSelectedYear(years[0])
                }
            }
        } catch (error) {
            console.error('Erro ao buscar anos disponíveis:', error)
        }
    }

    const availableLaunchTypes = useMemo(() => {
    return [
        (session?.user as any)?.canLaunchTithe ? {value: 'DIZIMO', label: 'Dízimo' } : null,
        (session?.user as any)?.canLaunchServiceOffer ? {value: 'OFERTA_CULTO', label: 'Oferta do Culto' } : null,
        (session?.user as any)?.canLaunchEbd ? {value: 'EBD', label: 'Ebd' } : null,
        (session?.user as any)?.canLaunchMission ? {value: 'MISSAO', label: 'Missão' } : null,
        (session?.user as any)?.canLaunchCampaign ? {value: 'CAMPANHA', label: 'Campanha' } : null,
        (session?.user as any)?.canLaunchVoto ? {value: 'VOTO', label: 'Voto' } : null,
        (session?.user as any)?.canLaunchCircle ? {value: 'CIRCULO', label: 'Círculo' } : null,
        (session?.user as any)?.canLaunchCarneReviver ? {value: 'CARNE_REVIVER', label: 'Carnê Reviver' } : null,
        (session?.user as any)?.canLaunchExpense ? {value: 'SAIDA', label: 'Saída' } : null,
    ]   
    }, [session] ).filter(Boolean) as {value: string, label: string}[]

    useEffect(() => {
        if (availableLaunchTypes.length === 1 && selectedLaunchTypes.length === 0) {
            setSelectedLaunchTypes([availableLaunchTypes[0].value])
        }
    }, [availableLaunchTypes, selectedLaunchTypes.length])

    useEffect(() => {
        fetchAvailableYears()
        fetchCongregations()
    }, [])

    useEffect(() => {
        if (selectedCongregations.length > 0 && selectedLaunchTypes.length > 0) {
            fetchPreview()
        } else {
            setPreviewData(null)
        }
    }, [selectedCongregations, selectedYear, selectedLaunchTypes])

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
                //position: selectedTypes.join(','),
                launchTypes: selectedLaunchTypes.join(','),
                //contributionFilter: contributionFilter, // Adicionado
                //showValues: showValues.toString(),
                congregationIds: selectedCongregations.join(','),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                preview: 'true'
            })

            const response = await fetch(`/api/reports/monthly-summary?${params.toString()}`)
            if (response.ok) {
                const data = await response.json()
                console.log('Preview data:', data)
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

    // const handleTypeSelection = (type: string, isChecked: boolean) => {
    //     if (isChecked) {
    //         setSelectedTypes(prev => [...prev, type])
    //     } else {
    //         setSelectedTypes(prev => prev.filter(t => t !== type))
    //     }
    // }

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
                //position: selectedTypes.join(','),
                launchTypes: selectedLaunchTypes.join(','),
                //contributionFilter: contributionFilter, // Adicionado
                // showValues: showValues.toString(),
                congregationIds: selectedCongregations.join(','),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })

            const response = await fetch(`/api/reports/monthly-summary?${params.toString()}`)
            if (!response.ok) alert("Erro ao gerar arquivo")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Resumo_Mensal_${selectedYear}.pdf`
            a.click()
        } catch (error) {
            console.error(error)
            alert("Falha na geração do relatório")
        } finally {
            setLoading(false)
        }
    }

    //const totalGeral = previewData.reduce((acc, val) => acc + val, 0)

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    if (!(session?.user as any)?.canReportMonthlySummary) {
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
                        <h1 className="text-2xl font-bold text-gray-900">Resumo Mensal</h1>
                        <p className="text-gray-600">Gere Resumo Mensal em PDF</p>
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o ano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableYears.length > 0 ? (
                                                availableYears.map(year => (
                                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>Carregando anos...</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* <div className="flex flex-col justify-end space-y-4">
                                    <div className="flex items-center justify-between p-2 border rounded-md">
                                        <Label htmlFor="show-vals" className="cursor-pointer">Exibir Valores (R$)</Label>
                                        <Switch id="show-vals" checked={showValues} onCheckedChange={setShowValues} />
                                    </div>
                                </div> */}
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
                                {/* <div>
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
                                </div> */}
                            </div>

                            {/* Seleção de Tipo de Lançamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                            {/* Novo Filtro de Contribuição */}
                            {/* <div className="space-y-2">
                                <Label>Filtro de Contribuição</Label>
                                <Select value={contributionFilter} onValueChange={setContributionFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de visualização" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BOTH">Ambos (Mostrar todos)</SelectItem>
                                        <SelectItem value="WITH_LAUNCH">Com Lançamento (Apenas quem contribuiu)</SelectItem>
                                        <SelectItem value="WITHOUT_LAUNCH">Sem Lançamento (Apenas quem não contribuiu)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[12px] text-gray-500 mt-2 italic">
                                    {contributionFilter === 'WITH_LAUNCH' && "* Filtrando apenas registros com valor maior que zero em algum mês."}
                                    {contributionFilter === 'WITHOUT_LAUNCH' && "* Filtrando apenas registros sem nenhuma contribuição no período."}
                                </p>
                            </div> */}
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
                            <CardContent>
                            {/* Preview da Tabela */}
                                <Card>
                                    <CardHeader className="bg-gray-50/50">
                                        <CardTitle className="text-sm font-medium">Preview dos Lançamentos - {selectedYear}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <Table className="border">
                                            <TableHeader>
                                                {/* Primeira linha do cabeçalho */}
                                                <TableRow className="bg-gray-100/50">
                                                    <TableHead rowSpan={2} className="border-r font-bold text-gray-900">Mês</TableHead>
                                                    <TableHead colSpan={3} className="text-center font-bold text-gray-900">Valores</TableHead>
                                                </TableRow>
                                                {/* Segunda linha do cabeçalho */}
                                                <TableRow className="bg-gray-100/50">
                                                    <TableHead className="text-right border-l text-blue-600">Entrada</TableHead>
                                                    <TableHead className="text-right border-l text-red-600">Saída</TableHead>
                                                    <TableHead className="text-right border-l font-bold text-gray-900">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {MONTHS.map((month, index) => (
                                                    <TableRow key={month}>
                                                        <TableCell className="font-medium border-r">{month}</TableCell>
                                                        <TableCell className="text-right border-l">
                                                            {previewData.monthlyData[index]?.income?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </TableCell>
                                                        <TableCell className="text-right border-l text-red-500">
                                                            {previewData.monthlyData[index]?.expense?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </TableCell>
                                                        <TableCell className={`text-right border-l font-bold ${previewData.monthlyData[index]?.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {previewData.monthlyData[index]?.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            {/* Rodapé com os Totais */}
                                            <tfoot className="bg-gray-50 font-bold">
                                                <TableRow>
                                                    <TableCell>TOTAIS</TableCell>
                                                    <TableCell className="text-right text-green-600">
                                                        {formatCurrency(previewData?.monthlyData.reduce((acc, d) => acc + d.income, 0) || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-600">
                                                        {formatCurrency(previewData?.monthlyData.reduce((acc, d) => acc + d.expense, 0) || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right" style={{ color: (previewData?.monthlyData.reduce((acc, d) => acc + d.income, 0) || 0) - (previewData?.monthlyData.reduce((acc, d) => acc + d.expense, 0) || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                                                        {formatCurrency(
                                                            (previewData?.monthlyData.reduce((acc, d) => acc + d.income, 0) || 0) - 
                                                            (previewData?.monthlyData.reduce((acc, d) => acc + d.expense, 0) || 0)
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            </tfoot>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    )}

                    {/* Botão de Gerar PDF */}
                    <Button
                        onClick={handleGenerateReport}
                        disabled={loading || selectedCongregations.length === 0 || selectedLaunchTypes.length === 0}
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
