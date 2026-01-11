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

interface Congregation {
    id: string
    code: string
    name: string
}

export default function ReportsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [congregations, setCongregations] = useState<Congregation[]>([])
    const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    // Estados para o Relatório de Contribuintes
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [selectedPosition, setSelectedPosition] = useState("TODOS")
    const [showValues, setShowValues] = useState(true)

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

    const availableTypes = useMemo(() => {
        const types: { value: string; label: string }[] = []
        const user = session?.user as any

        types.push({ value: 'MEMBRO', label: 'Membro' })
        types.push({ value: 'AUXILIAR', label: 'Auxiliar' })
        types.push({ value: 'DIACONO', label: 'Diácono' })
        types.push({ value: 'PRESBITERO', label: 'Presbítero' })
        types.push({ value: 'EVANGELISTA', label: 'Evangelista' })
        types.push({ value: 'PASTOR', label: 'Pastor' })
    return types
  }, [session])

    useEffect(() => {
        fetchCongregations()
    }, [])

    const fetchCongregations = async () => {
        try {
            const response = await fetch('/api/congregations')
            if (response.ok) {
                const data: Congregation[] = await response.json()
                setCongregations(data)

                // Se houver apenas uma congregação, definir como default
                if (data.length === 1) {
                    setSelectedCongregations([data[0].id])
                }
            }
        } catch (error) {
            console.error('Erro ao carregar congregações:', error)
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

    const handleGenerateReport = async () => {
        if (selectedCongregations.length === 0) return alert("Selecione ao menos uma congregação")

        setLoading(true)
        try {
            const params = new URLSearchParams({
                year: selectedYear,
                position: selectedTypes.join(','),
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card>
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


                                    {/* Seleção de Congregações e Tipos lado a lado */}
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

                                    <Button
                                        onClick={handleGenerateReport}
                                        disabled={isGenerating || selectedCongregations.length === 0 || selectedTypes.length === 0}
                                        className="w-full"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        {isGenerating ? 'Gerando...' : 'Gerar Relatório PDF'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}