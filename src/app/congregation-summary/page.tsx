// app/congregation-summary/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Check, X, FileText, DollarSign, TrendingUp, TrendingDown, UserCheck, Plus, Edit, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'

export default function CongregationSummary() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState([])
  const [selectedCongregation, setSelectedCongregation] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [summaryDate, setSummaryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedLaunch, setSelectedLaunch] = useState(null)
  const [approvalData, setApprovalData] = useState({
    treasury: null,
    accountant: null,
    director: null
  })
  const [approvedBy, setApprovedBy] = useState('')

  const [summaries, setSummaries] = useState([])
  const [selectedSummary, setSelectedSummary] = useState(null)
  const [launches, setLaunches] = useState<any[]>([]); 
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // const summaryDateStart = new Date(`${startDate}T12:00:00Z`)
    // const summaryDateEnd = new Date(`${endDate}T12:00:00Z`)
    // summaryDateStart.setHours(0, 0, 0, 0)
    // summaryDateEnd.setHours(0, 0, 0, 0)

  function dataAtualFormatada(){
    var data = new Date(),
        dia  = data.getDate().toString(),
        diaF = (dia.length == 1) ? '0'+dia : dia,
        mes  = (data.getMonth()+1).toString(), //+1 pois no getMonth Janeiro começa com zero.
        mesF = (mes.length == 1) ? '0'+mes : mes,
        anoF = data.getFullYear();
    return diaF+"/"+mesF+"/"+anoF;
  }

  useEffect(() => {
    if (session?.user?.canManageSummary) {
      fetchCongregations()
    }
  }, [session])

  useEffect(() => {
    if (selectedCongregation && startDate && endDate) {
      fetchSummaries()
    }
  }, [selectedCongregation, startDate, endDate])

    useEffect(() => {
    if (selectedSummary) {
      fetchLaunches()
    }
  }, [selectedSummary])

  const fetchCongregations = async () => {
    try {
      const response = await fetch('/api/congregations')
      if (response.ok) {
        const data = await response.json()
        setCongregations(data)
        
        // Se houver apenas uma congregação, definir como default
        if (data.length === 1) {
          setSelectedCongregation(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error)
    }
  }

  const fetchSummaries = async () => {
    try {
      const params = new URLSearchParams({
        congregationId: selectedCongregation,
        startDate: startDate,
        endDate: endDate,
        date: summaryDate
      })
      const response = await fetch(`/api/congregation-summary?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data)
      }
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
    }
  }

  const fetchLaunches = async () => {
    try {
      const response = await fetch(`/api/launches?congregationId=${selectedCongregation}&startDate=${selectedSummary.startDate}&endDate=${selectedSummary.endDate}`)
      if (response.ok) {
        const data = await response.json()
        setLaunches(data.launches || []);
      }
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
      setLaunches([]);
    }
  }

    const handleCreateSummary = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/congregation-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          congregationId: selectedCongregation,
          startDate: startDate,
          endDate: endDate,
          date: summaryDate
        })
      })

      if (response.ok) {
        fetchSummaries()
        setIsCreateDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao criar resumo')
      }
    } catch (error) {
      console.error('Erro ao criar resumo:', error)
      alert('Erro ao criar resumo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSummary = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/congregation-summary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedSummary.id,
          depositValue: selectedSummary.depositValue,
          cashValue: selectedSummary.cashValue,
          totalValue: selectedSummary.totalValue,
          treasurerApproved: selectedSummary.treasurerApproved,
          accountantApproved: selectedSummary.accountantApproved,
          directorApproved: selectedSummary.directorApproved
        })
      })

      if (response.ok) {
        fetchSummaries()
        setIsEditDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao atualizar resumo')
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo:', error)
      alert('Erro ao atualizar resumo')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!selectedCongregation || !startDate || !endDate) {
      alert('Selecione uma congregação e defina o período')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/congregation-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          congregationId: selectedCongregation,
          startDate: startDate,
          endDate: endDate,
          date: summaryDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSummaryData(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao gerar resumo')
      }
    } catch (error) {
      console.error('Erro ao gerar resumo:', error)
      alert('Erro ao gerar resumo')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = (launch) => {
    setSelectedLaunch(launch)
    setApproveDialogOpen(true)
  }

  const confirmApprove = async () => {
    if (!approvedBy) {
      alert('Selecione quem está aprovando')
      return
    }

    try {
      const response = await fetch('/api/congregation-summary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          launchId: selectedLaunch.id,
          approved: true,
          approvedBy
        })
      })

      if (response.ok) {
        // Atualizar o resumo
        const updatedApprovalData = { ...approvalData }
        if (approvedBy === 'tesoureiro') {
          updatedApprovalData.treasury = selectedLaunch
        } else if (approvedBy === 'contador') {
          updatedApprovalData.accountant = selectedLaunch
        } else if (approvedBy === 'dirigente') {
          updatedApprovalData.director = selectedLaunch
        }
        setApprovalData(updatedApprovalData)
        
        // Atualizar o resumo
        generateSummary()
        setApproveDialogOpen(false)
        setSelectedLaunch(null)
        setApprovedBy('')
      } else {
        const error = response.json()
        alert(error.error || 'Erro ao aprovar lançamento')
      }
    } catch (error) {
      console.error('Erro ao aprovar lançamento:', error)
      alert('Erro ao aprovar lançamento')
    }
  }

  // Verificar permissões
  const canManageSummary = session?.user?.canManageSummary
  const canApproveTreasury = session?.user?.canApproveTreasury
  const canApproveAccountant = session?.user?.canApproveAccountant
  const canApproveDirector = session?.user?.canApproveDirector

  if (!canManageSummary) {
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
            <h1 className="text-2xl font-bold text-gray-900">Resumo de Congregação</h1>
            <p className="text-gray-600">Visualize e aprove lançamentos financeiros</p>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="congregation">Congregação</Label>
                  <Select
                    value={selectedCongregation}
                    onValueChange={setSelectedCongregation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {congregations.map((congregation) => (
                        <SelectItem key={congregation.id} value={congregation.id}>
                          {congregation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="startDate">Data Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Resumos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Resumos
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Resumo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Resumo</DialogTitle>
                      <DialogDescription>
                        Isso criará um novo resumo para o período selecionado
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Tem certeza que deseja criar um resumo para o período de {dataAtualFormatada(new Date(startDate))} a {dataAtualFormatada(new Date(endDate))}?</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateSummary} disabled={isLoading}>
                        {isLoading ? 'Criando...' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum resumo encontrado para o período selecionado
                </div>
              ) : (
                <div className="space-y-4">
                  {summaries.map((summary) => (
                    <Card key={summary.id} className={`cursor-pointer ${selectedSummary?.id === summary.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedSummary(summary)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">
                              {format(new Date(summary.date), 'dd/MM/yyyy')}
                            </h3>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Entradas:</span>
                                <div className="font-medium">{summary.entryCount}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Saídas:</span>
                                <div className="font-medium">{summary.exitCount}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Total Entradas:</span>
                                <div className="font-medium">R$ {(summary.titheValue + summary.offerValue + summary.votesValue + summary.campaignValue + summary.ebdValue).toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Total Saídas:</span>
                                <div className="font-medium">R$ {summary.exitValue.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant={summary.treasurerApproved ? "default" : "secondary"}>
                              Tesoureiro: {summary.treasurerApproved ? "Aprovado" : "Pendente"}
                            </Badge>
                            <Badge variant={summary.accountantApproved ? "default" : "secondary"}>
                              Contador: {summary.accountantApproved ? "Aprovado" : "Pendente"}
                            </Badge>
                            <Badge variant={summary.directorApproved ? "default" : "secondary"}>
                              Dirigente: {summary.directorApproved ? "Aprovado" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhes do Resumo */}
          {selectedSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Detalhes do Resumo
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Editar Resumo</DialogTitle>
                        <DialogDescription>
                          Atualize os dados do resumo e as aprovações
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="depositValue">Valor do Depósito</Label>
                            <Input
                              id="depositValue"
                              type="number"
                              step="0.01"
                              value={selectedSummary.depositValue}
                              onChange={(e) => setSelectedSummary({
                                ...selectedSummary,
                                depositValue: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="cashValue">Valor em Espécie</Label>
                            <Input
                              id="cashValue"
                              type="number"
                              step="0.01"
                              value={selectedSummary.cashValue}
                              onChange={(e) => setSelectedSummary({
                                ...selectedSummary,
                                cashValue: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="totalValue">Total para Prestação de Contas</Label>
                            <Input
                              id="totalValue"
                              type="number"
                              step="0.01"
                              value={selectedSummary.totalValue}
                              onChange={(e) => setSelectedSummary({
                                ...selectedSummary,
                                totalValue: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Aprovações</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="treasurerApproved"
                                checked={selectedSummary.treasurerApproved}
                                onCheckedChange={(checked) => 
                                  setSelectedSummary({
                                    ...selectedSummary,
                                    treasurerApproved: checked
                                  })
                                }
                              />
                              <Label htmlFor="treasurerApproved">Tesoureiro</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="accountantApproved"
                                checked={selectedSummary.accountantApproved}
                                onCheckedChange={(checked) => 
                                  setSelectedSummary({
                                    ...selectedSummary,
                                    accountantApproved: checked
                                  })
                                }
                              />
                              <Label htmlFor="accountantApproved">Contador</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="directorApproved"
                                checked={selectedSummary.directorApproved}
                                onCheckedChange={(checked) => 
                                  setSelectedSummary({
                                    ...selectedSummary,
                                    directorApproved: checked
                                  })
                                }
                              />
                              <Label htmlFor="directorApproved">Dirigente</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleEditSummary} disabled={isLoading}>
                          {isLoading ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summary">Resumo</TabsTrigger>
                    <TabsTrigger value="launches">Lançamentos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Entradas</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Quantidade de Lançamentos:</span>
                            <span className="font-medium">{selectedSummary.entryCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dízimos:</span>
                            <span className="font-medium">R$ {selectedSummary.titheValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ofertas:</span>
                            <span className="font-medium">R$ {selectedSummary.offerValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Votos:</span>
                            <span className="font-medium">R$ {selectedSummary.votesValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Campanha:</span>
                            <span className="font-medium">R$ {selectedSummary.campaignValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>EBD:</span>
                            <span className="font-medium">R$ {selectedSummary.ebdValue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Saídas</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Quantidade de Lançamentos:</span>
                            <span className="font-medium">{selectedSummary.exitCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valor Total:</span>
                            <span className="font-medium">R$ {selectedSummary.exitValue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Prestação de Contas</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Valor do Depósito:</span>
                          <span className="font-medium">R$ {selectedSummary.depositValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valor em Espécie:</span>
                          <span className="font-medium">R$ {selectedSummary.cashValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total para Prestação de Contas:</span>
                          <span className="font-medium">R$ {selectedSummary.totalValue.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Aprovações</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            {selectedSummary.treasurerApproved ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>Tesoureiro</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedSummary.accountantApproved ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>Contador</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedSummary.directorApproved ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>Dirigente</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="launches">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {launches.map((launch) => (
                          <TableRow key={launch.id}>
                            <TableCell>
                              {format(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                launch.type === 'ENTRADA' ? 'default' : 
                                launch.type === 'DIZIMO' ? 'secondary' : 'destructive'
                              }>
                                {launch.type === 'ENTRADA' ? 'Entrada' : 
                                 launch.type === 'DIZIMO' ? 'Dízimo' : 'Saída'}
                              </Badge>
                            </TableCell>
                            <TableCell>{launch.description || '-'}</TableCell>
                            <TableCell>
                              {launch.type === 'ENTRADA' ? (
                                <div>
                                  <div>Oferta: R$ {launch.offerValue?.toFixed(2) || '0,00'}</div>
                                  <div>Votos: R$ {launch.votesValue?.toFixed(2) || '0,00'}</div>
                                  <div>EBD: R$ {launch.ebdValue?.toFixed(2) || '0,00'}</div>
                                  <div>Campanha: R$ {launch.campaignValue?.toFixed(2) || '0,00'}</div>
                                </div>
                              ) : (
                                <div>R$ {launch.value?.toFixed(2) || '0,00'}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={launch.status === 'NORMAL' ? 'default' : 'destructive'}>
                                {launch.status === 'NORMAL' ? 'Normal' : 'Cancelado'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}