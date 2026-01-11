"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, FileText } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Congregation {
  id: string
  code: string
  name: string
}

const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export default function Reports() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Determinar tipos de lançamento disponíveis baseado nas permissões do usuário
  const availableTypes = useMemo(() => {
    const types: { value: string; label: string }[] = []
    const user = session?.user as any

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

  useEffect(() => {
    fetchCongregations()
  }, [])

  // Se só houver um tipo disponível, pré-selecionar e desabilitar
  useEffect(() => {
    if (availableTypes.length === 1 && selectedTypes.length === 0) {
      setSelectedTypes([availableTypes[0].value])
    }
  }, [availableTypes.length])

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
    if (selectedCongregations.length === 0) {
      alert('Selecione pelo menos uma congregação')
      return
    }
    if (selectedTypes.length === 0) {
      alert('Selecione pelo menos um tipo de lançamento')
      return
    }
    if (!startDate || !endDate) {
      alert('Selecione o período')
      return
    }

    setIsGenerating(true)
    try {
      const params = new URLSearchParams()
      params.append('congregationIds', selectedCongregations.join(','))
      params.append('types', selectedTypes.join(','))
      params.append('startDate', formatDate(startDate, 'yyyy-MM-dd'))
      params.append('endDate', formatDate(endDate, 'yyyy-MM-dd'))
      params.append('timezone', USER_TIMEZONE)

      const response = await fetch(`/api/reports/launches?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio_lancamentos_${formatDate(startDate, 'yyyy-MM-dd')}_${formatDate(endDate, 'yyyy-MM-dd')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao gerar relatório')
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório')
    } finally {
      setIsGenerating(false)
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
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Lançamentos</h1>
            <p className="text-gray-600">Gere relatórios de lançamentos em PDF</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Filtros do Relatório</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                {/* Período */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data Início</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? formatDate(startDate, 'dd/MM/yyyy') : 'Data Início'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => {
                            setStartDate(d)
                            setStartDateOpen(false)
                          }}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Data Fim</Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? formatDate(endDate, 'dd/MM/yyyy') : 'Data Fim'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(d) => {
                            setEndDate(d)
                            setEndDateOpen(false)
                          }}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
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
                      <Label>Tipos de Lançamento</Label>
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

