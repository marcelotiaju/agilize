"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, FileText, Trash2, Plus, Save, Search, List } from 'lucide-react'
import { format } from 'date-fns'
import { id, ptBR } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { totalmem } from 'os'
import { NumericFormat } from 'react-number-format';

type Summary = {
  id: string;
  date: string;
  startDate: string;
  endDate: string;
  entryTotal: number;
  titheTotal: number;
  exitTotal: number;
  depositValue?: number;
  cashValue?: number;
  status: string;
  treasurerApproved?: boolean;
  accountantApproved?: boolean;
  directorApproved?: boolean;
  offerValue?: number;
  voteValue?: number;
  ebdValue?: number;
  campaignValue?: number;
  launches?: any[];
  // Add other properties as needed
};

export default function CongregationSummary() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<any[]>([])
  const [selectedCongregation, setSelectedCongregation] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSummary, setEditingSummary] = useState<Summary | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [launches, setLaunches] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('summaries')
  const [editFormData, setEditFormData] = useState({
    id: '',
    congregationId: '',
    date: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),  
    endDate: format(new Date(), 'yyyy-MM-dd'),
    depositValue: '',
    cashValue: '',
    treasurerApproved: false,
    accountantApproved: false,
    directorApproved: false,
    status: 'PENDING',
    // Campos para detalhamento
    offerValue: '',
    votesValue: '',
    ebdValue: '',
    campaignValue: '',
    entryTotal: '',
    titheTotal: '',
    exitTotal: '',
    totalTithe: 0,
    totalExit: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCongregations()
  }, [])

  useEffect(() => {
    if (selectedCongregation && startDate && endDate) {
      fetchSummaries()
    }
  }, [selectedCongregation, startDate, endDate])

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
    if (!selectedCongregation || !startDate || !endDate) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        congregationId: selectedCongregation,
        startDate,
        endDate,
        id: selectedSummary?.id || ''
      })
      
      const response = await fetch(`/api/congregation-summaries?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries || [])
        setLaunches(data.summaries.flatMap(summary => summary.Launch || []) || [])
      }
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
    } finally {
      setIsLoading(false)
    }
  }

// const fetchLaunches = async (summaryId) => {
//     try {
//       const response = await fetch(`/api/congregation-summaries/${summaryId}/launches`)
//       if (response.ok) {
//         const data = await response.json()
//         setLaunches(data)
//       }
//     } catch (error) {
//       console.error('Erro ao carregar lançamentos:', error)
//     }
//   }

  const handleCreateSummary = async () => {
    try {
      const response = await fetch('/api/congregation-summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...editFormData, congregationId: selectedCongregation })
      })

      if (response.ok) {
        fetchSummaries()
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao criar resumo')
      }
    } catch (error) {
      console.error('Erro ao criar resumo:', error)
      alert('Erro ao criar resumo')
    }
  }

  const handleEditSummary = (summary) => {
    setSelectedSummary(summary)
    setEditFormData({
      id: summary.id,
      congregationsId: summary.congregationId,
      startDate: new Date(summary.startDate),
      endDate: new Date(summary.endDate),
      depositValue: (summary.depositValue ?? 0).toString(), 
      cashValue: (summary.cashValue ?? 0).toString(),
      status: summary.status,
      treasurerApproved: summary.treasurerApproved ?? false,
      accountantApproved: summary.accountantApproved ?? false,
      directorApproved: summary.directorApproved ?? false,
      entryTotal: (summary.entryTotal ?? 0).toString(),
      titheTotal: (summary.titheTotal ?? 0).toString(), // Campo corrigido
      exitTotal: (summary.exitTotal ?? 0).toString(),   // Campo corrigido
      offerValue: summary.offerValue ?? 0,
      votesValue: summary.voteValue ?? 0, // ⭐️ CORRIGIDO: nome da propriedade era 'voteValue'
      ebdValue: summary.ebdValue ?? 0,
      campaignValue: summary.campaignValue ?? 0,
      totalTithe: summary.totalTithe || 0,
      totalExit: summary.totalExit || 0
    })
    setIsEditDialogOpen(true)
    setActiveTab('summaries')
    // fetchLaunches(summary.id)
  }

  const handleUpdateSummary = async () => {
    try {
      const response = await fetch('/api/congregation-summaries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedSummary.id,
          ...editFormData,
          depositValue: parseFloat(editFormData.depositValue),
          cashValue: parseFloat(editFormData.cashValue),
          treasurerApproved: editFormData.treasurerApproved,
          accountantApproved: editFormData.accountantApproved,
          directorApproved: editFormData.directorApproved,
        })
      })

      if (response.ok) {
        try {
          fetchSummaries()
          setIsEditDialogOpen(false)
        } catch (error) {
          console.error('Erro ao buscar resumos:', error)
          alert('Erro ao buscar resumos')
        }
      } else {
        try {
          const error = await response.json()
          alert(error.error || 'Erro ao atualizar resumo')
        } catch (error) {
          console.error('Erro ao atualizar resumo:', error)
          alert('Erro ao atualizar resumo')
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo:', error)
      alert('Erro ao atualizar resumo')
    }
  }

  const handleDeleteSummary = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este resumo?')) {
      try {
        const response = await fetch(`/api/congregation-summaries?id=${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          fetchSummaries()
        } else {
          const error = await response.json()
          alert(error.error || 'Erro ao excluir resumo')
        }
      } catch (error) {
        console.error('Erro ao excluir resumo:', error)
        alert('Erro ao excluir resumo')
      }
    }
  }

  const resetForm = () => {
    setEditFormData({
      congregationId: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  }

  if (!session?.user?.canManageSummary) {
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
            <h1 className="text-2xl font-bold text-gray-900">Resumo Congregação</h1>
            {/* <p className="text-gray-600">Gerencie os resumos financeiros das congregações</p> */}
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button onClick={handleCreateSummary} disabled={isLoading}>
                    {isLoading ? 'Listando...' : 'Gerar Resumo'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Resumos */}
          <Card>
            <CardHeader>
              <CardTitle>Resumos</CardTitle>
              <CardDescription>
                {summaries.length > 0 
                  ? `Mostrando ${summaries.length} resumo(s)` 
                  : 'Nenhum resumo encontrado'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum resumo encontrado para os filtros selecionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Entradas</TableHead>
                      <TableHead>Dízimos</TableHead>
                      <TableHead>Saídas</TableHead>
                      <TableHead>Aprovações</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell>
                          {format(new Date(summary.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(summary.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                          {format(new Date(summary.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>R$ {(summary.entryTotal ?? 0.00).toFixed(2)}</TableCell>
                        <TableCell>R$ {(summary.titheTotal ?? 0.00).toFixed(2)}</TableCell>
                        <TableCell>R$ {(summary.exitTotal ?? 0.00).toFixed(2)}</TableCell>
                        {/* <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editingSummary?.id === summary.id ? formData.depositAmount : summary.depositAmount || ''}
                            onChange={(e) => {
                              if (editingSummary?.id === summary.id) {
                                handleInputChange(e)
                              } else {
                                // Atualizar diretamente no backend
                                fetch(`/api/congregation-summaries`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    id: summary.id,
                                    depositAmount: e.target.value ? parseFloat(e.target.value) : null
                                  })
                                }).then(() => fetchSummaries())
                              }
                            }}
                            disabled={!editingSummary || editingSummary.id !== summary.id}
                            className="w-24"
                          />
                        </TableCell> */}
                        {/* <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editingSummary?.id === summary.id ? formData.cashAmount : summary.cashAmount || ''}
                            onChange={(e) => {
                              if (editingSummary?.id === summary.id) {
                                handleInputChange(e)
                              } else {
                                // Atualizar diretamente no backend
                                fetch(`/api/congregation-summaries`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    id: summary.id,
                                    cashAmount: e.target.value ? parseFloat(e.target.value) : null
                                  })
                                }).then(() => fetchSummaries())
                              }
                            }}
                            disabled={!editingSummary || editingSummary.id !== summary.id}
                            className="w-24"
                          />
                        </TableCell> */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={summary.treasurerApproved}
                                onCheckedChange={() => handleApprove(summary.id, 'treasurerApproved')}
                                disabled
                              />
                              <span className="text-sm">Tesoureiro</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={summary.accountantApproved}
                                onCheckedChange={() => handleApprove(summary.id, 'accountantApproved')}
                                disabled
                              />
                              <span className="text-sm">Contador</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={summary.directorApproved}
                                onCheckedChange={() => handleApprove(summary.id, 'directorApproved')}
                                disabled
                              />
                              <span className="text-sm">Dirigente</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={summary.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {summary.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSummary(summary)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSummary(summary.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Diálogo de Edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Editar Resumo</DialogTitle>
                <DialogDescription>
                  Atualize as informações do resumo
                </DialogDescription>
              </DialogHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summaries" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Resumos
                  </TabsTrigger>
                  <TabsTrigger value="launches" className="flex items-center" disabled={!selectedSummary}>
                    <List className="mr-2 h-4 w-4" />
                    Lançamentos
                  </TabsTrigger>
                </TabsList>
 
              <div className="max-h-[80vh] overflow-y-auto pr-4"> 
                <TabsContent value="summaries" className="mt-0">
                  <div className="space-y-4 py-4">
                      {/* Totais */}
                      {editFormData && (
                        <div className="pt-0 mt-0">
                          <h4 className="font-medium mb-2">Totais</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-4">
                                  {/* 1. CARD DE ENTRADAS (DETALHADO) */}
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                      <h5 className="font-medium text-blue-700">Entradas</h5>
                                      <div className="text-sm space-y-1">
                                          {/* Detalhes com Título à Esquerda e Valor à Direita */}
                                          <div className="flex justify-between">
                                              <span>Oferta:</span>
                                              <span className="font-semibold">
                                                  R$ {Number(editFormData.offerValue ?? 0).toFixed(2)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>Votos:</span>
                                              <span className="font-semibold">
                                                  R$ {Number(editFormData.votesValue ?? 0).toFixed(2)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>EBD:</span>
                                              <span className="font-semibold">
                                                  R$ {Number(editFormData.ebdValue ?? 0).toFixed(2)}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>Campanha:</span>
                                              <span className="font-semibold">
                                                  R$ {Number(editFormData.campaignValue ?? 0).toFixed(2)}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {/* 2. CARD DE DÍZIMOS */}
                                  <div className="bg-green-50 p-3 rounded-lg flex justify-between items-center">
                                      <h5 className="font-medium text-green-700">Dízimos</h5>
                                      <div className="text-md font-semibold flex justify-end">
                                          R$ {Number(editFormData.titheTotal).toFixed(2)}
                                      </div>
                                  </div>

                                  {/* ⭐️ NOVO: CARD TOTAL DE ENTRADAS (Entrada + Dízimo) ⭐️ */}
                                  <div className="bg-blue-100 p-3 rounded-lg border-2 border-blue-300">
                                      <div className="flex justify-between items-center">
                                          <h5 className="font-bold text-blue-800">Tot Entradas</h5>
                                          <div className="text-md font-extrabold text-blue-800">
                                              {/* Calcula Entradas (entryTotal) + Dízimo (titheTotal) */}
                                              R$ {(Number(editFormData.entryTotal) + Number(editFormData.titheTotal)).toFixed(2)}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* ⭐️ COLUNA DIREITA: SAÍDAS E TOTAIS FINAIS ⭐️ */}
                              <div className="flex flex-col gap-4">
                                  
                                  {/* 3. CARD TOTAL DE SAÍDAS */}
                                  <div className="bg-red-50 p-3 *:rounded-lg flex justify-between items-center md:mb-39">
                                      <h5 className="font-medium text-red-700">Saídas</h5>
                                      <div className="text-md font-semibold ">
                                          R$ {Number(editFormData.exitTotal).toFixed(2)}
                                      </div>
                                  </div>

                                 
                                  {/* ⭐️ NOVO: CARD TOTAL GERAL (Entrada - Saída) ⭐️ */}
                                  <div className="bg-purple-100 p-3 rounded-lg border-2 border-purple-300">
                                      <div className="flex justify-between items-center">
                                          <h5 className="font-bold text-purple-800">Saldo Geral</h5>
                                          <div className="text-md font-extrabold text-purple-800">
                                              {/* Calcula (Entrada + Dízimo) - Saída */}
                                              R$ {(
                                                  (Number(editFormData.entryTotal) + Number(editFormData.titheTotal)) - Number(editFormData.exitTotal)
                                              ).toFixed(2)}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                        </div>
                      )}
                    </div>
                      <div className='grid grid-cols-1 md:grid-cols-2 space-x-2'>
                        <div>
                        <Label htmlFor="depositValue">Valor Depósito</Label>
                        {/* <Input
                          id="depositValue"
                          name="depositValue"
                          type="number"
                          step="0.01"
                          value={editFormData.depositValue}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, depositValue: e.target.value }))}
                        /> */}
                        <NumericFormat
                            id="depositValue"
                            name="depositValue"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editFormData.depositValue || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setEditFormData(prev => ({ ...prev, depositValue: floatValue }));
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            allowNegative={false}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cashValue">Valor Espécie</Label>
                          {/* <Input
                            id="cashValue"
                            name="cashValue"
                            type="number"
                            step="0.01"
                            value={editFormData.cashValue}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, cashValue: e.target.value }))}
                          /> */}
                          <NumericFormat
                              id="cashValue"
                              name="cashValue"
                              className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={editFormData.cashValue || ''}
                              onValueChange={(values) => {
                                const { floatValue } = values;
                                setEditFormData(prev => ({ ...prev, cashValue: floatValue }));
                              }}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="R$ "
                              decimalScale={2}
                              fixedDecimalScale={true}
                              allowNegative={false}
                              placeholder="R$ 0,00"
                            />  
                        </div>                      
                      </div>

                      {/* ⭐️ NOVO: CARD TOTAL DE DEPÓSITO + ESPÉCIE ⭐️ */}
                      <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                              <h5 className="font-medium text-yellow-700">Total Depósito + Espécie</h5>
                              <div className="text-lg font-semibold text-yellow-800">
                                  {/* Calcula Depósito (depositValue) + Espécie (cashValue) */}
                                  R$ {(Number(editFormData.depositValue) + Number(editFormData.cashValue)).toFixed(2)}
                              </div>
                          </div>
                      </div>
                     
                      <div className="space-y-2">
                        <h4 className="font-medium">Aprovações</h4>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="treasurerApproved"
                              checked={editFormData.treasurerApproved}
                              disabled={!session.user.canApproveTreasury}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, treasurerApproved: e.target.checked }))}
                            />
                            <Label htmlFor="treasurerApproved">Tesoureiro</Label>
                          </div>
                        
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="accountantApproved"
                              checked={editFormData.accountantApproved}
                              disabled={!session.user.canApproveAccountant}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, accountantApproved: e.target.checked }))}
                            />
                            <Label htmlFor="accountantApproved">Contador</Label>
                          </div>
                        
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="directorApproved"
                              checked={editFormData.directorApproved}
                              disabled={
                                // Se o usuário não tem permissão DE DIRETOR OU
                                !session.user.canApproveDirector || 
                                // Se nenhuma das aprovações necessárias (Contador OU Tesoureiro) foi dada.
                                !(editFormData.accountantApproved || editFormData.treasurerApproved)
                              }
                              onChange={(e) => setEditFormData(prev => ({ ...prev, directorApproved: e.target.checked }))}
                            />
                            <Label htmlFor="directorApproved">Dirigente</Label>
                          </div>
                        </div>
                      </div>
                     </TabsContent> 

                  
                {/* Aba de Lançamentos */}
                <TabsContent value="launches" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {launches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Nenhum lançamento encontrado para este resumo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        launches.map((launch) => (
                          <TableRow key={launch.id}>
                            <TableCell>
                              {format(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                          <TableCell>
                            <div className={`w-full py-1 px-0 rounded text-center text-white font-medium ${
                              launch.type === 'ENTRADA' ? 'bg-green-500' : 
                              launch.type === 'DIZIMO' ? 'bg-blue-500' : 'bg-red-500'
                            }`}>
                              {launch.type === 'ENTRADA' ? 'Outras Receitas' : 
                               launch.type === 'DIZIMO' ? 'Dízimo' : 'Saída'}
                            </div>
                          </TableCell>
                            <TableCell>
                              R$ {(
                                (launch.offerValue || launch.votesValue || launch.ebdValue || launch.campaignValue || launch.value) || 0
                              ).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`w-full py-1.5 px-1 rounded text-center ${launch.status === 'EXPORTED' ? 'text-black' : 'text-white'} font-medium`} variant={
                                launch.status === 'NORMAL' ? 'default' :
                                launch.status === 'APPROVED' ? 'default' :
                                launch.status === 'EXPORTED' ? 'secondary' : 'destructive'
                              }>
                                {launch.status === 'NORMAL' ? 'Normal' : 
                                launch.status === 'APPROVED' ? 'Aprovado' :
                                launch.status === 'EXPORTED' ? 'Exportado' : 'Cancelado'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                </div>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateSummary}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}