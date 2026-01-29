"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, ArrowUp, CalendarIcon, Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Congregation {
  id: string
  code: string
  name: string
}

interface LaunchPreview {
  id: string
  type: string
  date: string
  description: string | null
  contributorName: string | null
  supplierName: string | null
  value: number
  isEntry: boolean
}

interface CongregationPreview {
  name: string
  launches: LaunchPreview[]
  entrada: number
  saida: number
}

interface PreviewData {
  totalEntrada: number
  totalSaida: number
  byCongregation: { name: string; entrada: number; saida: number }[]
  congregations: CongregationPreview[]
}

export default function Reports() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [importFilter, setImportFilter] = useState<'ALL' | 'IMPORTED' | 'MANUAL'>('MANUAL');

  // Estados de Filtro (assumindo que já existem no seu código)
  const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())

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
    if (availableTypes.length === 1 && selectedTypes.length === 0) {
      setSelectedTypes([availableTypes[0].value])
    }
  }, [availableTypes, selectedTypes.length, importFilter])

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

  // 1. Lógica de Scroll Corrigida
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => setShowScrollTop(container.scrollTop > 300)
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  // 2. Lógica de Prévia
  const loadPreview = async () => {
    if (selectedCongregations.length === 0 || selectedTypes.length === 0) {
      setPreviewData(null)
      return
    }
    setLoadingPreview(true)
    try {
      const params = new URLSearchParams({
        congregationIds: selectedCongregations.join(','),
        types: selectedTypes.join(','),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        preview: 'true',
        importFilter: importFilter
      })
      const res = await fetch(`/api/reports/launches?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewData(data)
      }
    } catch (e) {
      console.error(e)
      setPreviewData(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => loadPreview(), 500)
    return () => clearTimeout(delayDebounce)
  }, [selectedCongregations, selectedTypes, startDate, endDate, importFilter])

  const handleGenerateReport = async () => {
    if (selectedCongregations.length === 0) return alert("Selecione ao menos uma congregação")
    if (selectedTypes.length === 0) return alert("Selecione ao menos um tipo de lançamento")

    setIsGenerating(true)
    try {
      const params = new URLSearchParams({
        congregationIds: selectedCongregations.join(','),
        types: selectedTypes.join(','),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        importFilter: importFilter
      })

      const response = await fetch(`/api/reports/launches?${params.toString()}`)
      if (!response.ok) alert("Erro ao gerar arquivo")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Relatorio_Lancamentos_${formatDate(startDate, 'dd-MM-yyyy')}_${formatDate(endDate, 'dd-MM-yyyy')}.pdf`
      a.click()
    } catch (error) {
      console.error(error)
      alert("Falha na geração do relatório")
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const getTypeLabel = (type: string) => {
    const typeObj = availableTypes.find(t => t.value === type)
    return typeObj?.label || type
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Lançamentos</h1>
            {/* <p className="text-gray-600">Gere relatórios de lançamentos em PDF</p> */}
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros do Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Período */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        locale={ptBR}
                        onSelect={(d) => {
                          if (d) {
                            setStartDate(d)
                            setStartDateOpen(false)
                          }
                        }}
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
                        locale={ptBR}
                        onSelect={(d) => {
                          if (d) {
                            setEndDate(d)
                            setEndDateOpen(false)
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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
                  <FileText className="h-5 w-5" />
                  Prévia do Relatório
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-green-600">
                    Total Entradas: R$ {formatCurrency(previewData.totalEntrada)}
                  </span>
                  <span className="font-semibold text-red-600">
                    Total Saídas: R$ {formatCurrency(previewData.totalSaida)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* <ScrollArea className="h-96"> */}
                <div className="space-y-8">
                  {previewData.congregations.map((cong, congIdx) => (
                    <div key={congIdx}>
                      <h3 className="font-bold text-lg mb-3 text-primary">
                        {cong.name}
                      </h3>
                      <div className="border rounded-md">
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="border rounded-md overflow-x-auto">
                            <Table className='w-full'>
                              <TableHeader>
                                <TableRow className="bg-primary/10">
                                  <TableHead className="font-bold whitespace-nowrap w-[100px]">Data</TableHead>
                                  <TableHead className="font-bold whitespace-nowrap w-[120px]">Tipo</TableHead>
                                  <TableHead className="font-bold whitespace-nowrap">Contribuinte/Fornecedor</TableHead>
                                  <TableHead className="font-bold whitespace-nowrap w-auto">Descrição</TableHead>
                                  <TableHead className="text-right font-bold whitesspace-nowrap min-w-[100px]">Entrada</TableHead>
                                  <TableHead className="text-right font-bold whitespace-nowrap min-w-[100px]">Saída</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cong.launches.map((launch, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="whitespace-nowrap">{formatDate(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                    <TableCell className="font-medium whitespace-nowrap">{getTypeLabel(launch.type)}</TableCell>
                                    <TableCell className="max-w-[150px] truncate">
                                      {(launch.type === 'DIZIMO' || launch.type === 'CARNE_REVIVER') ? (launch.contributorName || '-') :
                                        launch.type === 'SAIDA' ? (launch.supplierName || '-') :
                                          '-'}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">{launch.description || '-'}</TableCell>
                                    <TableCell className="text-right text-green-600 whitespace-nowrap font-medium">
                                      {launch.isEntry ? `R$ ${formatCurrency(launch.value)}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 whitespace-nowrap font-medium">
                                      {!launch.isEntry ? `R$ ${formatCurrency(launch.value)}` : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {/* Linha de totais da congregação */}
                                <TableRow className="bg-gray-100 font-bold">
                                  <TableCell colSpan={4} className="whitespace-nowrap">TOTAL {cong.name}</TableCell>
                                  <TableCell className="text-right text-green-600 whitespace-nowrap">
                                    R$ {formatCurrency(cong.entrada)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 whitespace-nowrap">
                                    R$ {formatCurrency(cong.saida)}
                                  </TableCell>
                                </TableRow>
                                {/* Linha de saldo (entrada - saída) */}
                                <TableRow className="bg-blue-50 font-bold">
                                  <TableCell colSpan={4} className="whitespace-nowrap">SALDO ({cong.name})</TableCell>
                                  <TableCell colSpan={2} className="text-right whitespace-nowrap">
                                    <span className={cong.entrada - cong.saida >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      R$ {formatCurrency(cong.entrada - cong.saida)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </div>
                  ))}
                  {/* Linha de total geral se houver múltiplas congregações */}
                  {previewData.congregations.length > 1 && (
                    <div className="mt-4">
                      <div className="border rounded-md overflow-x-auto -mx-1">
                        <div className="min-w-full inline-block">
                          <Table className="min-w-[800px]">
                            <TableHeader>
                              <TableRow className="bg-blue-50">
                                <TableHead colSpan={4} className="font-bold text-lg">TOTAL GERAL</TableHead>
                                <TableHead className="text-right font-bold text-lg text-green-600 whitespace-nowrap min-w-[100px]">Entrada</TableHead>
                                <TableHead className="text-right font-bold text-lg text-red-600 whitespace-nowrap min-w-[100px]">Saída</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="bg-blue-50 font-bold">
                                <TableCell colSpan={4} className="text-lg">TOTAL DE TODAS AS CONGREGAÇÕES</TableCell>
                                <TableCell className="text-right text-lg text-green-600 whitespace-nowrap font-medium">
                                  R$ {formatCurrency(previewData.totalEntrada)}
                                </TableCell>
                                <TableCell className="text-right text-lg text-red-600 whitespace-nowrap font-medium">
                                  R$ {formatCurrency(previewData.totalSaida)}
                                </TableCell>
                              </TableRow>
                              {/* Linha de saldo geral */}
                              <TableRow className="bg-blue-100 font-bold">
                                <TableCell colSpan={4} className="text-lg">SALDO GERAL</TableCell>
                                <TableCell colSpan={2} className="text-right text-lg whitespace-nowrap">
                                  <span className={previewData.totalEntrada - previewData.totalSaida >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    R$ {formatCurrency(previewData.totalEntrada - previewData.totalSaida)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* </ScrollArea> */}
              </CardContent>
            </Card>
          )}

          {/* Botão de Gerar PDF */}
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedCongregations.length === 0 || selectedTypes.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
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

      {/* Botão Voltar ao Topo */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-[999] rounded-full w-12 h-12 shadow-2xl bg-blue-700"
          size="icon"
        >
          <ArrowUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  )
}