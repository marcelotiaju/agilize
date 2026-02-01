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
import { Input } from "@/components/ui/input"
import { Contributor } from "@prisma/client"
import * as XLSX from 'xlsx'
import format from "date-fns/format"

interface Congregation {
    id: string
    code: string
    name: string
}

interface MonthlyData {
    dizimo: number
    carne_reviver: number
    total: number
}

interface LaunchDetail {
    date: Date
    congregationName: string
    type: string
    value: number
}

interface ContributorPreview {
    name: string
    code: string
    launches: LaunchDetail[]
    total: number
}

interface CongregationPreview {
    name: string
    contributors: ContributorPreview[]
}

interface PreviewData {
    congregations: CongregationPreview[]
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
    const [importFilter, setImportFilter] = useState<'ALL' | 'IMPORTED' | 'MANUAL'>('MANUAL')
    const [contributors, setContributors] = useState<Contributor[]>([])
    const [contributorFilter, setContributorFilter] = useState('')
    const [allFilteredSelected, setAllFilteredSelected] = useState(false)
    const [formData, setFormData] = useState({
        contributorIds: [] as string[],
    })

    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

    const fetchAvailableYears = async () => {
        try {
            const response = await fetch('/api/reports/available-years')
            if (response.ok) {
                const years: string[] = await response.json()
                setAvailableYears(years)

                if (years.length > 0 && !selectedYear) {
                    setSelectedYear(years[0])
                }
            }
        } catch (error) {
            console.error('Erro ao buscar anos disponíveis:', error)
        }
    }

    
    const removeAccents = (str: string): string => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }

    const filteredContributors = useMemo(() => {
        return contributors.filter(contributor => {
            const isFromSelectedCongregation = selectedCongregations.includes(contributor.congregationId || '');
            const normalizedName = removeAccents(contributor.name.toLowerCase());
            const normalizedFilter = removeAccents(contributorFilter.toLowerCase());
            const matchesFilter = normalizedName.includes(normalizedFilter);

            return isFromSelectedCongregation && matchesFilter;
        });
    }, [contributors, selectedCongregations, contributorFilter]);

    const availableLaunchTypes = useMemo(() => {
        return [
            (session?.user as any)?.canLaunchTithe ? { value: 'DIZIMO', label: 'Dízimo' } : null,
            (session?.user as any)?.canLaunchCarneReviver ? { value: 'CARNE_REVIVER', label: 'Carnê Reviver' } : null,
        ].filter(Boolean) as { value: string, label: string }[]
    }, [session])

    useEffect(() => {
        if (availableLaunchTypes.length === 1 && selectedLaunchTypes.length === 0) {
            setSelectedLaunchTypes([availableLaunchTypes[0].value])
        }
    }, [availableLaunchTypes, selectedLaunchTypes.length])

    useEffect(() => {
        fetchAvailableYears()
        fetchCongregations()
        fetchContributors()
    }, [])

    useEffect(() => {
        if (selectedCongregations.length > 0 && selectedLaunchTypes.length > 0 && selectedYear && importFilter && formData.contributorIds.length > 0) {
            // Fetch preview regardless of contributor selection, but need at least congregations
            fetchPreview()
        } else {
            setPreviewData(null)
        }
    }, [selectedCongregations, selectedYear, selectedLaunchTypes, importFilter, formData.contributorIds])

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

    const fetchContributors = async () => {
        try {
            const response = await fetch('/api/contributors')
            if (response.ok) {
                const data: Contributor[] = await response.json()
                setContributors(data)
            }
        } catch (error) {
            console.error('Erro ao carregar contribuintes:', error)
        }
    }

    const fetchPreview = async () => {
        setLoadingPreview(true)
        try {
            const response = await fetch('/api/reports/history-contrib-analytic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: selectedYear,
                    launchTypes: selectedLaunchTypes,
                    congregations: selectedCongregations,
                    contributors: formData.contributorIds,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    preview: true,
                    importFilter: importFilter
                })
            })

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

    const handleContributorChange = (contributorId: string, checked: boolean) => {
        setFormData(prev => {
            const contributorIds = checked
                ? [...prev.contributorIds, contributorId]
                : prev.contributorIds.filter(id => id !== contributorId)

            return { ...prev, contributorIds }
        })
    }

    // Update allFilteredSelected state based on selection
    useEffect(() => {
        if (filteredContributors.length === 0) {
            setAllFilteredSelected(false)
            return
        }
        const allSelected = filteredContributors.every(c => formData.contributorIds.includes(c.id))
        setAllFilteredSelected(allSelected)
    }, [filteredContributors, formData.contributorIds])


    const handleSelectContributorAll = (checked: boolean) => {
        setFormData(prev => {
            const filteredIds = filteredContributors.map(c => c.id)
            let newContributorIds = [...prev.contributorIds];

            if (checked) {
                // Add absent ones
                filteredIds.forEach(id => {
                    if (!newContributorIds.includes(id)) {
                        newContributorIds.push(id)
                    }
                })
            } else {
                // Remove present ones
                newContributorIds = newContributorIds.filter(id => !filteredIds.includes(id))
            }
            return {
                ...prev,
                contributorIds: newContributorIds
            }
        })
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

    const handleExportExcel = () => {
        if (!previewData) return;

        const worksheetData: any[] = [];

        previewData.congregations.forEach(cong => {
            cong.contributors.forEach(cont => {
                cont.launches.forEach(launch => {
                    worksheetData.push({
                        'Congregação': cong.name,
                        'Contribuinte': cont.name,
                        'Data': format(new Date(launch.date), 'dd/MM/yyyy'),
                        'Tipo': launch.type === 'DIZIMO' ? 'Dízimo' : launch.type === 'CARNE_REVIVER' ? 'Carnê Reviver' : launch.type,
                        'Valor': formatCurrency(launch.value)
                    })
                })

                // Add Contributor Total Row
                worksheetData.push({
                    'Congregação': cong.name,
                    'Contribuinte': `${cont.name} (TOTAL)`,
                    'Data': '',
                    'Tipo': 'TOTAL',
                    'Valor': formatCurrency(cont.total)
                })
                
                // Add empty row for separation
                worksheetData.push({
                    'Congregação': '',
                    'Contribuinte': '',
                    'Data': '',
                    'Tipo': '',
                    'Valor': ''
                })
            });
        });

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório");
        XLSX.writeFile(wb, `Relatorio_Contribuicoes_Analitico_${selectedYear}.xlsx`);
    };

    const handleGenerateReport = async () => {
        if (selectedCongregations.length === 0) return alert("Selecione ao menos uma congregação")

        setLoading(true)
        try {
            const response = await fetch('/api/reports/history-contrib-analytic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: selectedYear,
                    launchTypes: selectedLaunchTypes,
                    congregations: selectedCongregations,
                    contributors: formData.contributorIds,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    importFilter: importFilter
                })
            })

            if (!response.ok) throw new Error("Erro ao gerar arquivo")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Historico_Contribuicoes_Analitico_${selectedYear}.pdf`
            a.click()
        } catch (error) {
            console.error(error)
            alert("Falha na geração do relatório")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                        <h1 className="text-2xl font-bold text-gray-900">Histórico de Contribuições Analítico</h1>
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

                                <div className="flex flex-col justify-end space-y-2">
                                    <Select value={importFilter} onValueChange={(v: any) => setImportFilter(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todos os Lançamentos</SelectItem>
                                            <SelectItem value="IMPORTED">Apenas Importados</SelectItem>
                                            <SelectItem value="MANUAL">Apenas Digitados</SelectItem>
                                        </SelectContent>
                                    </Select>
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

                                {/* Filtro de Contribuinte */}
                                <div className="md:col-span-2">
                                    <div className="mb-2">
                                        <Label htmlFor="contributorFilter" className="mb-2 block">Filtrar por nome</Label>
                                        <Input
                                            id="contributorFilter"
                                            type="text"
                                            placeholder="Digite o nome do contribuinte"
                                            value={contributorFilter}
                                            onChange={(e) => setContributorFilter(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Checkbox
                                            id="selectAll"
                                            checked={allFilteredSelected}
                                            onCheckedChange={handleSelectContributorAll}
                                        />
                                        <Label htmlFor="selectAll">
                                            {contributorFilter
                                                ? `Selecionar todos os contribuintes filtrados (${filteredContributors.length})`
                                                : 'Selecionar todos os contribuintes'}
                                        </Label>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                                        {filteredContributors.length > 0 ? (
                                            filteredContributors.map((contributor) => (
                                                <div key={contributor.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`contributor-${contributor.id}`}
                                                        checked={formData.contributorIds.includes(contributor.id)}
                                                        onCheckedChange={(checked) => handleContributorChange(contributor.id, checked as boolean)}
                                                    />
                                                    <Label htmlFor={`contributor-${contributor.id}`}>
                                                        {contributor.name}
                                                    </Label>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-500 text-center py-4">
                                                Nenhum contribuinte encontrado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prévia do Relatório */}
                    {previewData ? (
                        <Card className="mb-6">
                            <CardContent>
                                <Card>
                                    <CardHeader className="bg-gray-50/50">
                                        <CardTitle className="text-sm font-medium">Preview dos Lançamentos - {selectedYear}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <CardContent className="pt-6">
                                    {previewData.congregations.map((cong, congIdx) => (
                                        <div key={congIdx} className="mb-8 border-b pb-4">
                                            <h3 className="font-bold text-lg mb-4 text-primary bg-gray-100 p-2 rounded">
                                                Congregação: {cong.name}
                                            </h3>

                                            {cong.contributors.map((contrib, contribIdx) => (
                                                <div key={contribIdx} className="mb-6 pl-4 border-l-4 border-blue-500">
                                                    <h4 className="font-semibold text-md mb-2">Contribuinte: {contrib.name} ({contrib.code})</h4>
                                                    <Table className="border mb-4">
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-100/50">
                                                                <TableHead className="font-bold">Data</TableHead>
                                                                <TableHead className="font-bold">Congregação</TableHead>
                                                                <TableHead className="font-bold">Tipo de Lançamento</TableHead>
                                                                <TableHead className="text-right font-bold">Valor</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {contrib.launches && contrib.launches.length > 0 ? (
                                                                contrib.launches.map((launch, launchIdx) => (
                                                                    <TableRow key={launchIdx}>
                                                                        <TableCell>{format(new Date(launch.date), 'dd/MM/yyyy')}</TableCell>
                                                                        <TableCell>{launch.congregationName}</TableCell>
                                                                        <TableCell>{launch.type === 'DIZIMO' ? 'Dízimo' : launch.type === 'CARNE_REVIVER' ? 'Carnê Reviver' : launch.type}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(launch.value)}</TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="text-center text-gray-500">
                                                                        Nenhum lançamento encontrado
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                        <tfoot className="bg-gray-50 font-bold">
                                                            <TableRow>
                                                                <TableCell colSpan={3}>TOTAL</TableCell>
                                                                <TableCell className="text-right">
                                                                    {formatCurrency(contrib.total)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </tfoot>
                                                    </Table>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </CardContent>
                            </CardContent>
                        </Card>
                    ) : null}

                    <div className="flex gap-2">
                        <Button onClick={handleExportExcel} variant="outline" className="flex-1" disabled={!previewData}>Gerar Excel</Button>
                        <Button
                            onClick={handleGenerateReport}
                            disabled={loading || selectedCongregations.length === 0 || selectedLaunchTypes.length === 0 || formData.contributorIds.length === 0}
                            className="flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando PDF...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Gerar PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
