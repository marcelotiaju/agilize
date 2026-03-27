"use client"

import { useState, useEffect, useRef } from 'react'
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
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

interface Congregation {
  id: string
  code: string
  name: string
}

interface AccountabilityPreview {
  taloes: { talonNumber: string, date: string, dizimo: number, oferta: number, total: number }[]
  obreiros: { id: string, date: string, talonNumber: string, contributorName: string, cargo: string, value: number }[]
  saidas: { id: string, date: string, talonNumber: string, supplierName: string, classification: string, value: number }[]
  totals: {
    taloesDizimo: number,
    taloesOferta: number,
    taloesTotal: number,
    obreirosTotal: number,
    saidasTotal: number,
    resultado: number
  }
}

export default function AccountabilityReport() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewData, setPreviewData] = useState<AccountabilityPreview | null>(null)

  const [importFilter, setImportFilter] = useState<'ALL' | 'IMPORTED' | 'MANUAL' | 'INTEGRATED'>('ALL')
  const [selectedCongregations, setSelectedCongregations] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchCongregations()
  }, [])

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

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => setShowScrollTop(container.scrollTop > 300)
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const loadPreview = async () => {
    if (selectedCongregations.length === 0) {
      setPreviewData(null)
      return
    }
    setLoadingPreview(true)
    try {
      const params = new URLSearchParams({
        congregationIds: selectedCongregations.join(','),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        importFilter: importFilter
      })
      const res = await fetch(`/api/reports/accountability?${params}`)
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
  }, [selectedCongregations, startDate, endDate, importFilter])

  const handleGenerateReport = async () => {
    if (selectedCongregations.length === 0) return alert("Selecione ao menos uma congregação")

    setIsGenerating(true)
    try {
      const params = new URLSearchParams({
        congregationIds: selectedCongregations.join(','),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        importFilter: importFilter
      })

      const response = await fetch(`/api/reports/accountability/pdf?${params.toString()}`)
      if (!response.ok) throw new Error("Erro ao gerar arquivo PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Prestacao_Contas_${formatDate(startDate, 'dd-MM-yyyy')}_${formatDate(endDate, 'dd-MM-yyyy')}.pdf`
      a.click()
    } catch (error) {
      console.error(error)
      alert("Falha na geração do relatório. Verifique se o backend do PDF está implementado.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportExcel = () => {
    if (!previewData) return

    setIsGeneratingExcel(true)

    // Taloes
    const wsTaloesData: any[] = previewData.taloes.map(t => ({
      'Nro Talão': t.talonNumber,
      'Data': t.date ? formatDate(new Date(t.date), 'dd/MM/yyyy') : '',
      'Dízimo': Number(t.dizimo),
      'Oferta': Number(t.oferta),
      'Total': Number(t.total)
    }))
    wsTaloesData.push({
      'Nro Talão': 'TOTAL',
      'Data': '',
      'Dízimo': previewData.totals.taloesDizimo,
      'Oferta': previewData.totals.taloesOferta,
      'Total': previewData.totals.taloesTotal
    })

    // Obreiros
    const wsObreirosData: any[] = previewData.obreiros.map(o => ({
      'Nro Recibo': o.talonNumber,
      'Data': o.date ? formatDate(new Date(o.date), 'dd/MM/yyyy') : '',
      'Nome': o.contributorName,
      'Cargo': o.cargo,
      'Valor': Number(o.value)
    }))
    wsObreirosData.push({
      'Nro Recibo': 'TOTAL',
      'Data': '',
      'Nome': '',
      'Cargo': '',
      'Valor': previewData.totals.obreirosTotal
    })

    // Saidas
    const wsSaidasData: any[] = previewData.saidas.map(s => ({
      'Nro Doc': s.talonNumber,
      'Data': s.date ? formatDate(new Date(s.date), 'dd/MM/yyyy') : '',
      'Fornecedor': s.supplierName,
      'Classificação': s.classification,
      'Valor': Number(s.value)
    }))
    wsSaidasData.push({
      'Nro Doc': 'TOTAL',
      'Data': '',
      'Fornecedor': '',
      'Classificação': '',
      'Valor': previewData.totals.saidasTotal
    })

    const wb = XLSX.utils.book_new()

    const wsTaloes = XLSX.utils.json_to_sheet(wsTaloesData)
    const wsObreiros = XLSX.utils.json_to_sheet(wsObreirosData)
    const wsSaidas = XLSX.utils.json_to_sheet(wsSaidasData)

    // Resume sheet
    const wsResumo = XLSX.utils.json_to_sheet([{
      'Total Talões': previewData.totals.taloesTotal,
      'Total Dízimos/Obreiros': previewData.totals.obreirosTotal,
      'Total Saídas': previewData.totals.saidasTotal,
      'Resultado Final': previewData.totals.resultado
    }])

    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo")
    XLSX.utils.book_append_sheet(wb, wsTaloes, "Talões")
    XLSX.utils.book_append_sheet(wb, wsObreiros, "Dízimos e Obreiros")
    XLSX.utils.book_append_sheet(wb, wsSaidas, "Saídas")

    XLSX.writeFile(wb, `Prestacao_Contas_${formatDate(startDate, 'dd-MM-yyyy')}_${formatDate(endDate, 'dd-MM-yyyy')}.xlsx`)
    setIsGeneratingExcel(false)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleCongregationSelection = (id: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCongregations(prev => [...prev, id])
    } else {
      setSelectedCongregations(prev => prev.filter(cId => cId !== id))
    }
  }

  const handleSelectAllCongregations = () => {
    if (selectedCongregations.length === congregations.length) {
      setSelectedCongregations([])
    } else {
      setSelectedCongregations(congregations.map(c => c.id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:pl-64 flex flex-col min-h-screen overflow-hidden">
        <div className="p-6 flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Prestação de Contas</h1>
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
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatDate(startDate, 'dd/MM/yyyy') : 'Data Início'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        locale={ptBR as any}
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
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? formatDate(endDate, 'dd/MM/yyyy') : 'Data Fim'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        locale={ptBR as any}
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
                      <SelectItem value="INTEGRATED">Apenas Integrados</SelectItem>
                      <SelectItem value="MANUAL">Apenas Digitados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de Congregações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seleção de Congregações */}
                <div>
                  <Label>Congregações</Label>
                  <div className="space-y-2 mt-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                    <div className="flex items-center space-x-2 pb-1 border-b">
                      <Checkbox
                        id="selectAllCongregations"
                        checked={selectedCongregations.length === congregations.length && congregations.length > 0}
                        onCheckedChange={(checked) => handleSelectAllCongregations()}
                        disabled={congregations.length === 1}
                      />
                      <Label htmlFor="selectAllCongregations" className="font-semibold">
                        Marcar/Desmarcar Todas
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
                    {congregations.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Nenhuma congregação disponível</p>
                    )}
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
          ) : previewData ? (
            <>
              <Card className="mb-6">
                <CardHeader className="flex flex-col items-start gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prévia do Relatório
                  </CardTitle>
                  <div className="flex flex-col flex-wrap sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="font-semibold text-blue-700">
                      Total Talões: R$ {formatCurrency(previewData.totals.taloesTotal)}
                    </span>
                    <span className="font-semibold text-blue-700">
                      Total Dízimos/Obreiros: R$ {formatCurrency(previewData.totals.obreirosTotal)}
                    </span>
                    <span className="font-semibold text-red-600">
                      Total Saídas: R$ {formatCurrency(previewData.totals.saidasTotal)}
                    </span>
                    <span className={cn("font-bold text-base", previewData.totals.resultado >= 0 ? 'text-green-600' : 'text-red-600')}>
                      Resultado Final: R$ {formatCurrency(previewData.totals.resultado)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* 1. TALÕES */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 text-primary">1. Talões</h3>
                      <div className="border rounded-md">
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="border rounded-md overflow-x-auto">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-primary/10">
                                  <TableHead className="w-[120px] font-bold">Nro Talão</TableHead>
                                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                                  <TableHead className="text-right font-bold">Dízimo (Membros)</TableHead>
                                  <TableHead className="text-right font-bold">Ofertas</TableHead>
                                  <TableHead className="text-right font-bold">Total do Talão</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.taloes.map((l, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{l.talonNumber}</TableCell>
                                    <TableCell>{l.date ? formatDate(new Date(l.date), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell className="text-right">R$ {formatCurrency(l.dizimo)}</TableCell>
                                    <TableCell className="text-right">R$ {formatCurrency(l.oferta)}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">R$ {formatCurrency(l.total)}</TableCell>
                                  </TableRow>
                                ))}
                                {previewData.taloes.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">Nenhum talão encontrado.</TableCell>
                                  </TableRow>
                                )}
                                <TableRow className="bg-gray-100 font-bold border-t-2">
                                  <TableCell colSpan={2} className="text-right">TOTAL TALÕES</TableCell>
                                  <TableCell className="text-right">R$ {formatCurrency(previewData.totals.taloesDizimo)}</TableCell>
                                  <TableCell className="text-right">R$ {formatCurrency(previewData.totals.taloesOferta)}</TableCell>
                                  <TableCell className="text-right text-green-600">R$ {formatCurrency(previewData.totals.taloesTotal)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </div>

                    {/* 2. DÍZIMOS E OBREIROS */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 text-primary">2. Dízimos e Obreiros</h3>
                      <div className="border rounded-md">
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="border rounded-md overflow-x-auto">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-primary/10">
                                  <TableHead className="w-[120px] font-bold">Nro Recibo</TableHead>
                                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                                  <TableHead className="font-bold">Nome</TableHead>
                                  <TableHead className="font-bold">Cargo</TableHead>
                                  <TableHead className="text-right font-bold">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.obreiros.map((o) => (
                                  <TableRow key={o.id}>
                                    <TableCell className="font-medium">{o.talonNumber}</TableCell>
                                    <TableCell>{o.date ? formatDate(new Date(o.date), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{o.contributorName}</TableCell>
                                    <TableCell>{o.cargo}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">R$ {formatCurrency(o.value)}</TableCell>
                                  </TableRow>
                                ))}
                                {previewData.obreiros.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">Nenhum dízimo de obreiro encontrado.</TableCell>
                                  </TableRow>
                                )}
                                <TableRow className="bg-gray-100 font-bold border-t-2">
                                  <TableCell colSpan={4} className="text-right">TOTAL DÍZIMOS E OBREIROS</TableCell>
                                  <TableCell className="text-right text-green-600">R$ {formatCurrency(previewData.totals.obreirosTotal)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </div>

                    {/* 3. SAÍDAS */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 text-primary">3. Saídas</h3>
                      <div className="border rounded-md">
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="border rounded-md overflow-x-auto">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-primary/10">
                                  <TableHead className="w-[120px] font-bold">Nro Doc</TableHead>
                                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                                  <TableHead className="font-bold">Fornecedor</TableHead>
                                  <TableHead className="font-bold">Classificação</TableHead>
                                  <TableHead className="text-right font-bold">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.saidas.map((s) => (
                                  <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.talonNumber}</TableCell>
                                    <TableCell>{s.date ? formatDate(new Date(s.date), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{s.supplierName}</TableCell>
                                    <TableCell>{s.classification}</TableCell>
                                    <TableCell className="text-right font-medium text-red-600">R$ {formatCurrency(s.value)}</TableCell>
                                  </TableRow>
                                ))}
                                {previewData.saidas.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">Nenhuma saída encontrada.</TableCell>
                                  </TableRow>
                                )}
                                <TableRow className="bg-gray-100 font-bold border-t-2">
                                  <TableCell colSpan={4} className="text-right">TOTAL SAÍDAS</TableCell>
                                  <TableCell className="text-right text-red-600">R$ {formatCurrency(previewData.totals.saidasTotal)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
              
              <div className="flex gap-2 pb-6">
                <Button
                  onClick={handleExportExcel}
                  disabled={!previewData}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isGeneratingExcel ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Excel...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Gerar Excel
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || selectedCongregations.length === 0}
                  className="flex-1"
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
                      Gerar PDF
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (selectedCongregations.length > 0 ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">Ajuste os filtros para carregar a prévia do relatório.</p>
            </div>
          ) : null)}

        </div>
      </div>

      {/* Botão Voltar ao Topo */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 z-40 rounded-full w-12 h-12 shadow-2xl bg-blue-700"
          size="icon"
        >
          <ArrowUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  )
}
