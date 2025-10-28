"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Trash2, List, Check, Edit, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { id, ptBR } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NumericFormat } from 'react-number-format';
import { zonedTimeToUtc } from 'date-fns-tz'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
//import { toast } from "sonner"

// Definindo o tipo de Congregação para usar no estado
type Congregation = {
  id: string;
  name: string;
};

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
  missionValue?: number;
  missionTotal?: number;
  circleValue?: number;
  circleTotal?: number;
  launches?: any[];
  // Add other properties as needed
};

// Get the user's timezone
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function CongregationSummary() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<any[]>([])
  const [selectedCongregations, setSelectedCongregations] = useState<string[]>([]) // MUDANÇA: Array de IDs
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
    missionTotal: '',
    circleTotal: '',
    entryTotal: '',
    titheTotal: '',
    exitTotal: '',
    totalTithe: 0,
    totalExit: 0
  })
  const [isLoading, setIsLoading] = useState(false)

    // Memoization para calcular o Saldo Geral e o Total Depositado/Espécie
  const totalEntradas = useMemo(() => Number(editFormData.entryTotal) + Number(editFormData.titheTotal) + Number(editFormData.missionTotal) + Number(editFormData.circleTotal), [editFormData.entryTotal, editFormData.titheTotal]);
  const saldoGeral = useMemo(() => totalEntradas - Number(editFormData.exitTotal), [totalEntradas, editFormData.exitTotal]);
  const totalDepositadoEspecie = useMemo(() => Number(editFormData.depositValue) + Number(editFormData.cashValue), [editFormData.depositValue, editFormData.cashValue]);
  
  // Datas
  const [startSummaryDate, setStartSummaryDate] = useState<Date | undefined>(new Date());
  const [endSummaryDate, setEndSummaryDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    fetchCongregations()
  }, [])

  useEffect(() => {
    // Busca resumos apenas para a primeira congregação selecionada para simplificar
    if (selectedCongregations && Array.isArray(selectedCongregations) && selectedCongregations.length > 0 && startSummaryDate && endSummaryDate) {
      fetchSummaries(selectedCongregations) 
    } else {
      setSummaries([])
    }
  }, [selectedCongregations, startSummaryDate, endSummaryDate])

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

  const fetchSummaries = async (congregationIds:string[]) => {
    if (!congregationIds || !Array.isArray(congregationIds) || congregationIds.length === 0 || !startSummaryDate || !endSummaryDate) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        congregationIds: congregationIds.join(','),
        id: selectedSummary?.id || ''
      })

      params.append('timezone', USER_TIMEZONE)

      if (startSummaryDate) {
        const s = new Date(startSummaryDate)
        s.setHours(0, 0, 0, 0)
        const startUtc = zonedTimeToUtc(s, USER_TIMEZONE)
        params.append('startSummaryDate', startUtc.toISOString())
      }
      if (endSummaryDate) {
        const e = new Date(endSummaryDate)
        e.setHours(23, 59, 59, 999)
        const endUtc = zonedTimeToUtc(e, USER_TIMEZONE)
        params.append('endSummaryDate', endUtc.toISOString())
      }
      
      const response = await fetch(`/api/congregation-summaries?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries || [])
        // Simplificação: apenas pega lançamentos do primeiro resumo para visualização
        // setLaunches(data.summaries.flatMap((summary: Summary) => summary.Launch || []) || [])
      } else {
         //console.error('Erro na resposta da API:', await response.json());
         setSummaries([]);
         setLaunches([]);
      }
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
      setSummaries([]);
      setLaunches([]);
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
    if (selectedCongregations.length === 0) {
//      toast.error("Atenção", {
//        description: (
//          <p className="space-y-1 text-gray-500">
//            {"Selecione pelo menos uma congregação para gerar o resumo."}
//          </p>
//        ),
//      })
      alert("Selecione pelo menos uma congregação para gerar o resumo.")
      return
    }

    setIsLoading(true);
    let successCount = 0;
    let errorMessages: string[] = [];

    for (const congregationId of selectedCongregations) {
        try {
            const response = await fetch('/api/congregation-summaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...editFormData, 
                    congregationId, 
                    startDate: editFormData.startDate, // Passa as datas dos filtros
                    endDate: editFormData.endDate,     // Passa as datas dos filtros
                    timezone: USER_TIMEZONE
                })
            })

            if (response.ok) {
                successCount++;
            } else {
                const error = await response.json();
                errorMessages.push(`Congregação ${congregations.find(c => c.id === congregationId)?.name}: ${error.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error(`Erro ao criar resumo para ${congregationId}:`, error);
            errorMessages.push(`Congregação ${congregations.find(c => c.id === congregationId)?.name}: Falha na requisição.`);
        }
    }

    // Feedback final
    setIsLoading(false);
    if (successCount > 0) {
    //    toast.success("Sucesso!",{
    //        description: (
    //          <div className="space-y-1 text-gray-500">
    //          {` ${successCount} resumo(s) criado(s) com sucesso.`}
    //          </div>
    //        ),
    //    });
         alert(`${successCount} resumo(s) criado(s) com sucesso.`);
        fetchSummaries(selectedCongregations);
    }

    if (errorMessages.length > 0) {
    //    toast.error( "Atenção - Erros",{
    //        description: (
    //            <div className="space-y-1  text-gray-500">
    //                <p>{`${errorMessages.length} resumo(s) falhou(falharam) ao ser(em) criado(s):`}</p>
    //                <ul className="list-disc ml-4">
    //                    {errorMessages.map((msg, index) => <li key={index}>{msg}</li>)}
    //                </ul>
    //            </div>
    //        ),
    //        duration: 8000,
    //    });
	alert(`${errorMessages.length} resumo(s) falhou(falharam) ao ser(em) criado)s):`);
    }

    setIsCreateDialogOpen(false)
    // resetForm() // Não reseta o form, pois ele está sendo usado como filtro
  }

  const handleEditSummary = (summary: Summary) => {
    setSelectedSummary(summary)
    setEditFormData({
      id: summary.id,
      congregationId: summary.congregationId, 
      startDate: format(new Date(summary.startDate), 'yyyy-MM-dd'), 
      endDate: format(new Date(summary.endDate), 'yyyy-MM-dd'),
      depositValue: (summary.depositValue ?? 0).toString(), 
      cashValue: (summary.cashValue ?? 0).toString(),
      status: summary.status,
      treasurerApproved: summary.treasurerApproved ?? false,
      accountantApproved: summary.accountantApproved ?? false,
      directorApproved: summary.directorApproved ?? false,
      entryTotal: (summary.entryTotal ?? 0).toString(),
      titheTotal: (summary.titheTotal ?? 0).toString(), 
      exitTotal: (summary.exitTotal ?? 0).toString(),  
      missionTotal: (summary.missionValue ?? 0).toString(),
      circleTotal: (summary.circleValue ?? 0).toString(),
      offerValue: summary.offerValue ?? 0,
      votesValue: summary.votesValue ?? 0, 
      ebdValue: summary.ebdValue ?? 0,
      campaignValue: summary.campaignValue ?? 0,
      missionValue: summary.missionValue ?? 0,
      circleValue: summary.circleValue ?? 0,
      totalTithe: summary.totalTithe || 0,
      totalExit: summary.totalExit || 0
    })
    setLaunches(summary.Launch || []) 
   // launches.filter(launch => launch.summaryId === summary.id)
    setIsEditDialogOpen(true)
    setActiveTab('summaries')
    //fetchLaunches(summary.id)
  }

  const handleUpdateSummary = async () => {
    // ⭐️ MUDANÇA 1: Validação de Saldo Geral ⭐️
    if (Math.abs(saldoGeral - totalDepositadoEspecie) > 0.001) { // Tolerância de 1 centavo
    //  toast.error("O Saldo Geral não confere!", {
    //    description: (
    //      <><p className="space-y-1 text-gray-500">
    //        {`A soma de Depósito e Espécie (R$ ${totalDepositadoEspecie.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser igual ao Saldo Geral (R$ ${saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`}
    //      </p></>
    //    ),
    //  })
       alert(`O Saldo Geral não confere! A soma de Depósito e Espécie (R$ ${totalDepositadoEspecie.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser igual ao Saldo Geral (R$ ${saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`)
      return;
    }
    // ⭐️ FIM MUDANÇA 1 ⭐️
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
          // fetchSummaries(selectedSummary?.congregationId || selectedCongregations)
          if (selectedCongregations.length > 0) {
              // Chama a função com o array de IDs atualmente selecionado
              fetchSummaries(selectedCongregations);
          } else if (selectedSummary?.congregationId) {
              // Fallback: Se não houver seleção, recarrega apenas a congregação que acabou de ser editada
              fetchSummaries([selectedSummary.congregationId]); 
          }
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
          fetchSummaries(selectedCongregations)
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

    // MUDANÇA: Lógica para gerenciar a seleção múltipla
  const handleCongregationSelection = (id: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCongregations(prev => [...prev, id])
    } else {
      setSelectedCongregations(prev => prev.filter(cId => cId !== id))
    }
  }

  // MUDANÇA: Lógica para Marcar/Desmarcar Todos
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedCongregations(congregations.map(c => c.id))
    } else {
      setSelectedCongregations([])
    }
  }

  // const resetForm = () => {
  //   setEditFormData({
  //     congregationId: '',
  //     startDate: format(new Date(), 'yyyy-MM-dd'),
  //     endDate: format(new Date(), 'yyyy-MM-dd')
  //   })
  // }

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
                {/* MUDANÇA 2: Seleção Múltipla de Congregações */}
                <div className="col-span-1 md:col-span-4 lg:col-span-1">
                  <Label htmlFor="congregation">Congregação(ões)</Label>
                  <div className="space-y-2 mt-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                    <div className="flex items-center space-x-2 pb-1 border-b">
                      <Checkbox
                        id="selectAllCongregations"
                        checked={selectedCongregations.length === congregations.length && congregations.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
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
                        />
                        <Label htmlFor={`congregation-${congregation.id}`}>
                          {congregation.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {/* FIM MUDANÇA 2 */}
                
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

                <div className="flex items-start md:mt-3">
                  <Button onClick={handleCreateSummary} disabled={isLoading}>
                    {isLoading ? 'Listando...' : 'Gerar Resumo'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Resumos */}
          <Card>
            <CardHeader className='flex items-center'>
              <CardTitle>Resumos</CardTitle>
              <CardDescription>
                {summaries.length > 0 
                  ? `Mostrando ${summaries.length} resumo(s)` 
                  : ''
                }
              </CardDescription>

              {/* Data Inicial */}
              <div className="w-full sm:w-44">
                <Label className="sr-only">Data Inicial</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startSummaryDate ? format(startSummaryDate, 'dd/MM/yyyy') : 'Data Inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startSummaryDate}
                      onSelect={(d) => { 
                        setStartSummaryDate(d); 
                        setStartDateOpen(false);
                        //setCurrentPage(1); 
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data Final */}
              <div className="w-full sm:w-44">
                <Label className="sr-only">Data Final</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endSummaryDate ? format(endSummaryDate, 'dd/MM/yyyy') : 'Data Final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endSummaryDate}
                      onSelect={(d) => { 
                        setEndSummaryDate(d);
                        setEndDateOpen(false);
                        //setCurrentPage(1); 
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

            </CardHeader>
            <CardContent>
             {summaries.length === 0 && !isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum resumo encontrado para os filtros selecionados.
                </div>
              ) : isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Carregando resumos...
                </div>
              ) : (
                <>
                  {/* MUDANÇA 3: Tabela para Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead>Outras Receitas</TableHead>
                          <TableHead>Dízimos</TableHead>
                          <TableHead>Missao</TableHead>
                          <TableHead>Circulo</TableHead>                                                    
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
                              {format(new Date(summary.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                              {format(new Date(summary.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell>R$ {(summary.entryTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.titheTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.missionTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.circleTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>                            
                            <TableCell>R$ {(summary.exitTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={summary.treasurerApproved} disabled />
                                  <span className="text-sm">Tesoureiro</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={summary.accountantApproved} disabled />
                                  <span className="text-sm">Contador</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={summary.directorApproved} disabled />
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
                                  variant="destructive"
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
                  </div>

                  {/* MUDANÇA 3: Cards para Mobile */}
                  <div className="md:hidden space-y-4">
                    {summaries.map((summary) => (
                      <Card key={summary.id} className="border-l-4">
                        <CardHeader className="py-3">
                          <CardTitle className="text-base flex justify-between items-center">
                              {/* Nome da Congregação (assumindo que você adicione esta informação ao tipo Summary) */}
                              <span className="text-gray-700 font-semibold">
                                  {congregations.find(c => c.id === selectedCongregations[0])?.name || "Resumo"}
                              </span>
                              <Badge variant={summary.status === 'APPROVED' ? 'default' : 'secondary'}>
                                  {summary.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                              </Badge>
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {format(new Date(summary.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                            {format(new Date(summary.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between border-t pt-2">
                                <span>Outras Receitas:</span>
                                <span className="font-medium text-blue-600">
                                    R$ {(summary.entryTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Dízimos:</span>
                                <span className="font-medium text-green-600">
                                    R$ {(summary.titheTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Missao:</span>
                                <span className="font-medium text-orange-600">
                                    R$ {(summary.missionTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Circulo:</span>
                                <span className="font-medium text-yellow-600">
                                    R$ {(summary.circleTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>                                                        
                            <div className="flex justify-between">
                                <span>Saídas:</span>
                                <span className="font-medium text-red-600">
                                    R$ {(summary.exitTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            
                            <div className="pt-2 border-t">
                                <h4 className="font-medium mb-1">Aprovações:</h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <Badge variant={summary.treasurerApproved ? 'default' : 'secondary'} className="justify-center">
                                        {summary.treasurerApproved ? <Check className='h-3 w-3 mr-1' /> : ''} Tesoureiro
                                    </Badge>
                                    <Badge variant={summary.accountantApproved ? 'default' : 'secondary'} className="justify-center">
                                        {summary.accountantApproved ? <Check className='h-3 w-3 mr-1' /> : ''} Contador
                                    </Badge>
                                    <Badge variant={summary.directorApproved ? 'default' : 'secondary'} className="justify-center">
                                        {summary.directorApproved ? <Check className='h-3 w-3 mr-1' /> : ''} Dirigente
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex justify-between space-x-2 pt-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSummary(summary)}
                                // className="w-full"
                              >
                              <Edit className="h-4 w-4 mr-1" /> Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSummary(summary.id)}
                                // className="w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </Button>
                            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {/* FIM MUDANÇA 3 */}
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Diálogo de Edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Editar Resumo</DialogTitle>
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
                  <div className="space-y-2 py-2">
                      {/* Totais */}
                      {editFormData && (
                        <div className="pt-0 mt-0">
                          <h4 className="font-medium mb-2">Totais</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-2">
                                  {/* 1. CARD DE OUTRAS RECEITAS (DETALHADO) */}
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                      <h5 className="font-medium text-blue-700">Outras Receitas</h5>
                                      <div className="text-sm space-y-0">
                                          {/* Detalhes com Título à Esquerda e Valor à Direita */}
                                          <div className="flex justify-between">
                                              <span>Oferta:</span>
                                              <span>
                                                  R$ {Number(editFormData.offerValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>Votos:</span>
                                              <span>
                                                  R$ {Number(editFormData.votesValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>EBD:</span>
                                              <span>
                                                  R$ {Number(editFormData.ebdValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                          </div>
                                          <div className="flex justify-between">
                                              <span>Campanha:</span>
                                              <span>
                                                  R$ {Number(editFormData.campaignValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                          </div>
                                          <div className="flex justify-between font-semibold">
                                              <span>Total:</span>
                                              <span className="font-semibold">
                                                  R$ {Number(editFormData.entryTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                          </div>                                          
                                      </div>
                                  </div>
                                  
                                  {/* 2. CARD DE DÍZIMOS */}
                                  <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                      <h5 className="font-medium text-green-700">Dízimos</h5>
                                      <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.titheTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                  </div>

                                  {/* 2. CARD DE MISSAO */}
                                  <div className="bg-orange-50 p-1 rounded-lg flex justify-between items-center">
                                      <h5 className="font-medium text-orange-700">Missao</h5>
                                      <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.missionTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                  </div>

                                  {/* 2. CARD DE CIRCULO */}
                                  <div className="bg-yellow-50 p1 rounded-lg flex justify-between items-center">
                                      <h5 className="font-medium text-yellow-700">Circulo</h5>
                                      <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.circleTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                  </div>                                                                    

                                  {/* ⭐️ NOVO: CARD TOTAL DE ENTRADAS (Entrada + Dízimo) ⭐️ */}
                                  <div className="bg-blue-100 p-1 rounded-lg border-2 border-blue-300">
                                      <div className="flex justify-between items-center">
                                          <h5 className="font-bold font-small text-blue-800">Tot Entradas</h5>
                                          <div className="text-sm font-extrabold text-blue-800">
                                              {/* Calcula Entradas (entryTotal) + Dízimo (titheTotal) */}
                                              R$ {(Number(editFormData.entryTotal) + Number(editFormData.titheTotal) + + Number(editFormData.missionTotal) + + Number(editFormData.circleTotal)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* ⭐️ COLUNA DIREITA: SAÍDAS E TOTAIS FINAIS ⭐️ */}
                              <div className="flex flex-col gap-4">
                                  
                                  {/* 3. CARD TOTAL DE SAÍDAS */}
                                  <div className="bg-red-50 p-1 *:rounded-lg flex justify-between items-center md:mb-55">
                                      <h5 className="font-medium text-red-700">Saídas</h5>
                                      <div className="text-sm font-semibold ">
                                          R$ {Number(editFormData.exitTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                  </div>

                                 
                                  {/* ⭐️ NOVO: CARD TOTAL GERAL (Entrada - Saída) ⭐️ */}
                                  <div className="bg-purple-100 p-1 rounded-lg border-2 border-purple-300">
                                      <div className="flex justify-between items-center">
                                          <h5 className="font-bold text-purple-800">Saldo Geral</h5>
                                          <div className="text-sm font-extrabold text-purple-800">
                                              {/* Calcula (Entrada + Dízimo) - Saída */}
                                              R$ {(
                                                  (Number(editFormData.entryTotal) + Number(editFormData.titheTotal) + + Number(editFormData.missionTotal) + + Number(editFormData.circleTotal)) - Number(editFormData.exitTotal)
                                              ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                        </div>
                      )}
                    </div>
                      <div className='grid grid-cols-1 md:grid-cols-2 space-x-4'>
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
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <div className="bg-yellow-50 p-1 rounded-lg">
                          <div className="flex justify-between items-center">
                              <h5 className="font-small text-yellow-700">Total Depósito + Espécie</h5>
                              <div className="text-sm font-semibold text-yellow-800">
                                  {/* Calcula Depósito (depositValue) + Espécie (cashValue) */}
                                  R$ {(Number(editFormData.depositValue) + Number(editFormData.cashValue)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                              disabled={!session.user.canApproveTreasury || editFormData.accountantApproved}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, treasurerApproved: e.target.checked }))}
                            />
                            <Label htmlFor="treasurerApproved">Tesoureiro</Label>
                          </div>
                        
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="accountantApproved"
                              checked={editFormData.accountantApproved}
                              disabled={!session.user.canApproveAccountant || editFormData.treasurerApproved}
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
                              launch.type === 'DIZIMO' ? 'bg-blue-500' : 
                              launch.type === 'SAIDA'? 'bg-red-500' :
                              launch.type === 'MISSAO'? 'bg-orange-500' :
                              launch.type === 'CIRCULO'? 'bg-yellow-500' : ''
                            }`}>
                            {launch.type === 'ENTRADA' ? 'Outras Receitas' : 
                              launch.type === 'DIZIMO' ? 'Dízimo' : 
                              launch.type === 'SAIDA' ? 'Saída' :
                              launch.type === 'MISSAO' ? 'Missão' :
                              launch.type === 'CIRCULO' ? 'Círculo de Oração' : ''}
                            </div>
                          </TableCell>
                            <TableCell>
                              R$ {(
                                (launch.offerValue + launch.votesValue + launch.ebdValue + launch.campaignValue + launch.value) || 0
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
