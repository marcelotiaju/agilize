"use client"
import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { format as formatDate } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Trash2, List, Check, Edit, CalendarIcon, Printer, ArrowUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NumericFormat } from 'react-number-format';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import format from "date-fns/format";
import { useRouter } from 'next/navigation'
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
  offerTotal?: number;
  votesTotal?: number;
  ebdTotal?: number;
  campaignTotal?: number;
  missionTotal?: number;
  circleTotal?: number;
  carneReviverTotal?: number;
  talonNumber: string;
  depositValue?: number;
  cashValue?: number;
  status: string;
  summaryType?: string;
  treasurerApproved?: boolean;
  accountantApproved?: boolean;
  directorApproved?: boolean;
  launches?: any[];
  createdAt: string;
  createdBy?: string;
  approvedByTreasury?: string;
  approvedAtTreasury?: string;
  approvedByAccountant?: string;
  approvedAtAccountant?: string;
  approvedByDirector?: string;
  approvedAtDirector?: string;
  // Add other properties as needed
};

// Get the user's timezone
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function CongregationSummary() {
  const { data: session } = useSession()
  const canAccessLaunches = ['canLaunchVote',
    'canLaunchEbd',
    'canLaunchCampaign',
    'canLaunchTithe',
    'canLaunchMission',
    'canLaunchCircle',
    'canLaunchServiceOffer',
    'canLaunchExpense',
    'canLaunchCarneReviver',
    'canApproveVote',
    'canApproveEbd',
    'canApproveCampaign',
    'canApproveTithe',
    'canApproveMission',
    'canApproveCircle',
    'canApproveServiceOffer',
    'canApproveExpense'];
  const [congregations, setCongregations] = useState<any[]>([])
  const [selectedCongregations, setSelectedCongregations] = useState<string[]>([]) // MUDANÇA: Array de IDs
  const [startDate, setStartDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'))
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
    startDate: formatDate(new Date(), 'yyyy-MM-dd'),
    endDate: formatDate(new Date(), 'yyyy-MM-dd'),
    talonNumber: '',
    offerTotal: '',
    votesTotal: '',
    ebdTotal: '',
    campaignTotal: '',
    missionTotal: '',
    circleTotal: '',
    carneReviverTotal: '',
    entryTotal: '',
    titheTotal: '',
    exitTotal: '',
    totalTithe: 0,
    totalExit: 0,
    depositValue: null,
    cashValue: null,
    summaryType: '',
    summaryId: '',
    treasurerApproved: false,
    accountantApproved: false,
    directorApproved: false,
    status: 'PENDING',
    createdAt: '',
    createdBy: '',
    approvedByTreasury: '',
    approvedAtTreasury: '',
    approvedByAccountant: '',
    approvedAtAccountant: '',
    approvedByDirector: '',
    approvedAtDirector: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [summaryType, setSummaryType] = useState<string>('')
  const [pageYPosition, setPageYPosition] = useState(0);
  const router = useRouter()

  // Detectar scroll para mostrar/esconder botão de voltar ao topo
  useEffect(() => {
    const handleScroll = () => {
      setPageYPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determinar tipos de resumo disponíveis baseado nas permissões do usuário
  const availableSummaryTypes = useMemo(() => {
    const types: { value: string; label: string }[] = []
    const user = session?.user as any

    // Padrão: Dízimos, Oferta do Culto, Votos, EBD, Campanha
    if (user?.canLaunchTithe ||
      user?.canLaunchServiceOffer ||
      user?.canLaunchVote ||
      user?.canLaunchEbd ||
      user?.canLaunchCampaign ||
      user?.canLaunchMission) {
      types.push({ value: 'PADRAO', label: 'Padrão' })
    }

    // Missão
    // if (user?.canLaunchMission) {
    //   types.push({ value: 'MISSAO', label: 'Missão' })
    // }

    // Carnê Reviver
    // if (user?.canLaunchCarneReviver) {
    //   types.push({ value: 'CARNE_REVIVER', label: 'Carnê Reviver' })
    // }

    // Círculo de Oração
    // if (user?.canLaunchCircle) {
    //   types.push({ value: 'CIRCULO', label: 'Círculo de Oração' })
    // }

    return types
  }, [session])

  // Se só houver um tipo disponível, pré-selecionar e desabilitar
  useEffect(() => {
    if (availableSummaryTypes.length === 1 && !summaryType) {
      setSummaryType(availableSummaryTypes[0].value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSummaryTypes.length])

  // Memoization para calcular o Saldo Geral e o Total Depositado/Espécie
  const totalEntradas = useMemo(() => Number(editFormData.titheTotal ?? 0) + Number(editFormData.offerTotal ?? 0) + Number(editFormData.votesTotal ?? 0) + Number(editFormData.ebdTotal ?? 0) + Number(editFormData.campaignTotal ?? 0) + Number(editFormData.missionTotal ?? 0) + Number(editFormData.circleTotal ?? 0), [editFormData.entryTotal, editFormData.titheTotal]);
  const saldoGeral = useMemo(() => totalEntradas - Number(editFormData.exitTotal), [totalEntradas, editFormData.exitTotal]);
  const totalDepositadoEspecie = useMemo(() => (Number(editFormData.depositValue ?? 0) + Number(editFormData.cashValue ?? 0)), [editFormData.depositValue, editFormData.cashValue]);

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

  const handlePrintSummary = async (summaryId: string) => {
    if (!summaryId) return;
    const params = new URLSearchParams({
      summaryId: summaryId,
      timezone: USER_TIMEZONE
    })

    const response = await fetch(`/api/reports/summary?${params}`)
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // LOGICA PARA DOWNLOAD
      const link = document.createElement('a')
      link.href = url
      link.download = `Relatorio_Resumo.pdf` // Nome do arquivo
      document.body.appendChild(link)
      link.click()

      // Limpeza
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      //window.open(url, '_blank')
    }
  }

  const fetchSummaries = async (congregationIds: string[]) => {
    if (!congregationIds || congregationIds.length === 0) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('timezone', USER_TIMEZONE)
      // enviar apenas CSV, sem repetir parâmetros
      params.append('congregationIds', congregationIds.join(','))

      // datas no timezone do usuário
      if (startSummaryDate) {
        params.append('startSummaryDate', formatDate(utcToZonedTime(startSummaryDate, USER_TIMEZONE), 'yyyy-MM-dd'))
      }
      if (endSummaryDate) {
        params.append('endSummaryDate', formatDate(utcToZonedTime(endSummaryDate, USER_TIMEZONE), 'yyyy-MM-dd'))
      }

      console.log('fetchSummaries params:', params.toString())
      const response = await fetch(`/api/congregation-summaries?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries || [])
      } else {
        //console.error('fetchSummaries failed', response.status, await response.text())
        setSummaries([])
      }
    } catch (err) {
      console.error(err)
      setSummaries([])
    } finally {
      setIsLoading(false)
    }
  }

  // handleCreateSummary: envia strings yyyy-MM-dd + timezone
  const handleCreateSummary = async () => {
    if (selectedCongregations.length === 0) {
      alert('Selecione pelo menos uma congregação')
      return
    }
    // simple validation
    if (!editFormData.startDate || !editFormData.endDate) {
      alert('Defina período')
      return
    }
    if (!summaryType) {
      alert('Selecione o tipo de resumo')
      return
    }

    const startStr = editFormData.startDate // 'yyyy-MM-dd'
    const endStr = editFormData.endDate
    let hasSuccess = false
    let hasError = false
    const errors: string[] = []

    for (const congregationId of selectedCongregations) {
      try {
        const response = await fetch('/api/congregation-summaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editFormData,
            congregationId,
            startDate: startStr,
            endDate: endStr,
            summaryType: summaryType,
            timezone: USER_TIMEZONE
          })
        })
        if (response.ok) {
          // atualizar lista
          await fetchSummaries(selectedCongregations)
          hasSuccess = true
        } else {
          const err = await response.json()
          hasError = true
          errors.push(err.error || 'Erro ao criar resumo')
        }
      } catch (err) {
        console.error(err)
        hasError = true
        errors.push('Erro ao criar resumo')
      }
    }

    if (hasSuccess && !hasError) {
      setIsCreateDialogOpen(false)
      alert(`Resumo(s) criado(s) com sucesso.`)
      // Mudar para a aba de listagem após criar com sucesso
      setMainActiveTab('listar')
    } else if (hasError) {
      // Mostrar apenas os erros, não mostrar mensagem de sucesso se houver erros
      errors.forEach(error => alert(error))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Validações para campos específicos
    if (name === 'talonNumber') {
      // Permitir apenas números
      const numericValue = value.replace(/\D/g, '')
      setEditFormData(prev => ({ ...prev, [name]: numericValue }))
      return
    }

    if (name === 'value') {
      // aceitar apenas números e separadores
      const numericValue = value.replace(/[^\d.,]/g, '')
      const formattedValue = numericValue.replace(/,/g, '.')
      setEditFormData(prev => ({ ...prev, [name]: formattedValue }))
      return
    }
  }

  // Ao abrir edição: converte ISO UTC para date-only no timezone do usuário
  const handleEditSummary = (summary: Summary) => {
    setSelectedSummary(summary)
    setEditFormData({
      id: summary.id,
      congregationId: (summary as any).congregationId || '',
      startDate: summary.startDate ? formatDate(utcToZonedTime(new Date(summary.startDate), USER_TIMEZONE), 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd'),
      endDate: summary.endDate ? formatDate(utcToZonedTime(new Date(summary.endDate), USER_TIMEZONE), 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd'),
      talonNumber: summary.talonNumber || '',
      date: summary.date ? formatDate(utcToZonedTime(new Date(summary.date), USER_TIMEZONE), 'yyyy-MM-dd') : '',
      depositValue: (summary.depositValue === 0 ? null : (summary.depositValue ?? null)),
      cashValue: (summary.cashValue === 0 ? null : (summary.cashValue ?? null)),
      treasurerApproved: summary.treasurerApproved ?? false,
      accountantApproved: summary.accountantApproved ?? false,
      directorApproved: summary.directorApproved ?? false,
      status: summary.status || 'PENDING',
      offerTotal: summary.offerTotal ?? '',
      votesTotal: summary.votesTotal ?? '',
      ebdTotal: summary.ebdTotal ?? '',
      campaignTotal: summary.campaignTotal ?? '',
      missionTotal: summary.missionTotal ?? '',
      circleTotal: summary.circleTotal ?? '',
      carneReviverTotal: (summary as any).carneReviverTotal ?? '',
      entryTotal: summary.entryTotal ?? '',
      titheTotal: summary.titheTotal ?? '',
      exitTotal: summary.exitTotal ?? '',
      totalTithe: summary.titheTotal ?? 0,
      totalExit: summary.exitTotal ?? 0,
      summaryType: (summary as any).summaryType || '',
      summaryId: summary.id || '',
      createdAt: summary.createdAt || '',
      createdBy: summary.createdBy || '',
      approvedByTreasury: summary.approvedByTreasury || '',
      approvedAtTreasury: summary.approvedAtTreasury || '',
      approvedByAccountant: summary.approvedByAccountant || '',
      approvedAtAccountant: summary.approvedAtAccountant || '',
      approvedByDirector: summary.approvedByDirector || '',
      approvedAtDirector: summary.approvedAtDirector || '',
    })
    setLaunches(summary.Launch || [])
    setIsEditDialogOpen(true)
    setActiveTab('summaries')
  }

  const handleUpdateSummary = async () => {
    // ⭐️ MUDANÇA 1: Validação de Saldo Geral ⭐️
    // if (Math.abs(saldoGeral - totalDepositadoEspecie) > 0.001) { // Tolerância de 1 centavo
    //    alert(`O Saldo Geral não confere! A soma de Depósito e Espécie (R$ ${totalDepositadoEspecie.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser igual ao Saldo Geral (R$ ${saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`)
    //   return;
    // }

    try {
      const response = await fetch('/api/congregation-summaries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedSummary.id,
          ...editFormData,
          talonNumber: editFormData.talonNumber,
          depositValue: editFormData.depositValue ?? 0,
          cashValue: editFormData.cashValue ?? 0,
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

  // Handle approval toggle directly from listing
  const handleApprovalToggle = async (summary: Summary, approvalType: 'treasurer' | 'accountant' | 'director') => {
    const user = session?.user as any

    // Determine current state and new state
    let isCurrentlyApproved = false
    let approvedByField = ''
    let canApprove = false

    if (approvalType === 'treasurer') {
      isCurrentlyApproved = summary.treasurerApproved ?? false
      approvedByField = summary.approvedByTreasury || ''
      canApprove = user?.canApproveTreasury
    } else if (approvalType === 'accountant') {
      isCurrentlyApproved = summary.accountantApproved ?? false
      approvedByField = summary.approvedByAccountant || ''
      canApprove = user?.canApproveAccountant
    } else if (approvalType === 'director') {
      isCurrentlyApproved = summary.directorApproved ?? false
      approvedByField = summary.approvedByDirector || ''
      canApprove = user?.canApproveDirector
    }

    // Check permissions
    if (!canApprove) {
      alert('Você não tem permissão para esta aprovação.')
      return
    }

    // If trying to unapprove, check if current user was the one who approved
    if (isCurrentlyApproved && approvedByField && approvedByField !== session?.user?.name) {
      alert('Apenas o usuário que aprovou pode desmarcar a aprovação.')
      return
    }

    // Check for dual permission conflict
    const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
    if (hasBothPermissions) {
      if (approvalType === 'treasurer' && summary.accountantApproved && summary.approvedByAccountant === session?.user?.name) {
        alert('Você já aprovou como Contador. Não pode aprovar como Tesoureiro.')
        return
      }
      if (approvalType === 'accountant' && summary.treasurerApproved && summary.approvedByTreasury === session?.user?.name) {
        alert('Você já aprovou como Tesoureiro. Não pode aprovar como Contador.')
        return
      }
    }

    // Prepare update data
    const isApproving = !isCurrentlyApproved
    const updateData: any = {
      id: summary.id,
      congregationId: (summary as any).congregationId,
      startDate: summary.startDate,
      endDate: summary.endDate,
      talonNumber: summary.talonNumber,
      depositValue: summary.depositValue ?? 0,
      cashValue: summary.cashValue ?? 0,
      treasurerApproved: summary.treasurerApproved ?? false,
      accountantApproved: summary.accountantApproved ?? false,
      directorApproved: summary.directorApproved ?? false,
      approvedByTreasury: summary.approvedByTreasury || '',
      approvedAtTreasury: summary.approvedAtTreasury || '',
      approvedByAccountant: summary.approvedByAccountant || '',
      approvedAtAccountant: summary.approvedAtAccountant || '',
      approvedByDirector: summary.approvedByDirector || '',
      approvedAtDirector: summary.approvedAtDirector || '',
    }

    // Update the specific approval
    if (approvalType === 'treasurer') {
      updateData.treasurerApproved = isApproving
      updateData.approvedByTreasury = isApproving ? (session?.user?.name || '') : ''
      updateData.approvedAtTreasury = isApproving ? new Date().toISOString() : ''
    } else if (approvalType === 'accountant') {
      updateData.accountantApproved = isApproving
      updateData.approvedByAccountant = isApproving ? (session?.user?.name || '') : ''
      updateData.approvedAtAccountant = isApproving ? new Date().toISOString() : ''
    } else if (approvalType === 'director') {
      updateData.directorApproved = isApproving
      updateData.approvedByDirector = isApproving ? (session?.user?.name || '') : ''
      updateData.approvedAtDirector = isApproving ? new Date().toISOString() : ''
    }

    // Send update request
    try {
      const response = await fetch('/api/congregation-summaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        // Refresh the summaries list
        fetchSummaries(selectedCongregations)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao atualizar aprovação')
      }
    } catch (error) {
      console.error('Erro ao atualizar aprovação:', error)
      alert('Erro ao atualizar aprovação')
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

  const [mainActiveTab, setMainActiveTab] = useState(session?.user?.canGenerateSummary ? "gerar" : "listar")

  if (!session?.user?.canListSummary && !session?.user?.canGenerateSummary) {
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
        <div className="p-4">
          <div className="flex mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Resumo Diário</h1>
            {/* <p className="text-gray-600">Gerencie os resumos financeiros das congregações</p> */}
            {(canAccessLaunches) &&
              <Button
                //variant="defaulSt"
                onClick={() => router.push('/launches')}
                className="md:flex items-center gap-2 ml-2 bg-indigo-800 hover:bg-indigo-800 text-white"
              >
                <List className="h-4 w-4" />
                Lançamentos
              </Button>}
          </div>

          {/* Seleção de Congregações - Sempre Visível */}
          <Card className="mb-2">
            {/* <CardHeader>
              <CardTitle>Seleção de Congregação(ões)</CardTitle>
            </CardHeader> */}
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Abas Principal */}
          <Tabs value={mainActiveTab} onValueChange={setMainActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {session?.user?.canGenerateSummary && (
                <TabsTrigger value="gerar" >Gerar Resumo</TabsTrigger>
              )}
              {session?.user?.canListSummary && (
                <TabsTrigger value="listar">Visualizar Resumos</TabsTrigger>
              )}
            </TabsList>

            {/* Aba: Gerar Resumo */}
            {session?.user?.canGenerateSummary && (
              <TabsContent value="gerar">
                <Card>
                  {/* <CardHeader>
                  <CardTitle>Gerar Novo Resumo</CardTitle>
                </CardHeader> */}
                  <CardContent>
                    <div className="space-y-1">
                      <div className="w-full">
                        <Label htmlFor="summaryType">Tipo de Resumo</Label>
                        <Select
                          value={summaryType}
                          onValueChange={setSummaryType}
                          disabled={availableSummaryTypes.length === 1}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo de resumo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSummaryTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="max-w-[300px] sm:max-w-full">
                                <span className="truncate block">
                                  {type.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableSummaryTypes.length === 0 && (
                          <p className="text-sm text-red-600 mt-1">Você não tem permissão para gerar nenhum tipo de resumo</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="w-full">
                          <Label htmlFor="startDate">Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editFormData.startDate ? formatDate(new Date(`${editFormData.startDate}T00:00:00`), 'dd/MM/yyyy') : 'Data'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editFormData.startDate ? new Date(`${editFormData.startDate}T00:00:00`) : undefined}
                                onSelect={(d) => {
                                  if (d) {
                                    const dateStr = formatDate(d, 'yyyy-MM-dd')
                                    setEditFormData({
                                      ...editFormData,
                                      startDate: dateStr,
                                      endDate: dateStr // Define data final igual a inicial
                                    })
                                  }
                                }}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Data Fim oculta - mantida a lógica via state */}

                        <div className="flex items-end pt-2">
                          <Button onClick={handleCreateSummary} disabled={isLoading || !summaryType} className="w-full bg-amber-700 text-white">
                            {isLoading ? 'Gerando...' : 'Criar Resumo'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Aba: Listagem de Resumos */}
            {session?.user?.canListSummary && (
              <TabsContent value="listar">
                <Card>
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-start gap-3">
                    {/* <CardTitle>Filtrar Resumos</CardTitle> */}
                    <CardDescription>
                      {summaries.length > 0
                        ? `Mostrando ${summaries.length} resumo(s)`
                        : ''
                      }
                    </CardDescription>

                    {/* Data Inicial */}
                    <div className="w-full flex items-center justify-start gap-2">
                      <div className="w-full sm:w-44">
                        <Label className="sr-only">Data Inicial</Label>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startSummaryDate ? formatDate(startSummaryDate, 'dd/MM/yyyy') : 'Data Inicial'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startSummaryDate}
                              onSelect={(d) => {
                                setStartSummaryDate(d);
                                setStartDateOpen(false);
                              }}
                              locale={ptBR}
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
                              {endSummaryDate ? formatDate(endSummaryDate, 'dd/MM/yyyy') : 'Data Final'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endSummaryDate}
                              onSelect={(d) => {
                                setEndSummaryDate(d);
                                setEndDateOpen(false);
                              }}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
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
                        <div className="hidden md:block w-full overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Período</TableHead>
                                {/* <TableHead>Dízimos</TableHead>
                          <TableHead>Oferta</TableHead>
                          <TableHead>Carne Reviver</TableHead>
                          <TableHead>Votos</TableHead>
                          <TableHead>EBD</TableHead>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Missão</TableHead>
                          <TableHead>Círculo</TableHead>                                                    
                          <TableHead>Saídas</TableHead> */}
                                <TableHead>Aprovações</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summaries.map((summary) => (
                                <TableRow key={summary.id}>
                                  <TableCell className="flex flex-col justify-center">
                                    <span className="text-gray-700 font-semibold wrap-break-word max-w-xs md:max-w-20 mt-1">
                                      {/* {congregations.find(c => c.id === selectedCongregations[0])?.name || "Resumo"} */}
                                      {congregations.find(c => c.id === (summary as any).congregationId)?.name || "Resumo"}
                                    </span>
                                    <div>
                                      {formatDate(new Date(summary.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                                      {/* {formatDate(new Date(summary.endDate), 'dd/MM/yyyy', { locale: ptBR })} */}
                                    </div>
                                  </TableCell>
                                  {/* <TableCell>R$ {(summary.titheTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.offerTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.carneReviverTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.votesTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.ebdTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.campaignTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.missionTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>R$ {(summary.circleTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>                            
                            <TableCell>R$ {(summary.exitTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell> */}
                                  <TableCell>
                                    <div className="flex flex-row gap-1">
                                      {/* Botão Tesoureiro */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={summary.treasurerApproved ? "default" : "outline"}
                                        className={cn(
                                          "flex-1 text-xs transition-all px-2",
                                          summary.treasurerApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                        )}
                                        disabled={(() => {
                                          const user = session?.user as any
                                          const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                          const approvedByOther = summary.approvedByTreasury && summary.approvedByTreasury !== session?.user?.name
                                          const alreadyApprovedAsAccountant = hasBothPermissions && summary.accountantApproved && summary.approvedByAccountant === session?.user?.name
                                          return !user?.canApproveTreasury || alreadyApprovedAsAccountant || approvedByOther
                                        })()}
                                        onClick={() => handleApprovalToggle(summary, 'treasurer')}
                                        title="Tesoureiro"
                                      >
                                        {summary.treasurerApproved ? (
                                          <><Check className="h-3 w-3" />Tesoureiro</>
                                        ) : (
                                          "Tesoureiro"
                                        )}
                                      </Button>

                                      {/* Botão Contador */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={summary.accountantApproved ? "default" : "outline"}
                                        className={cn(
                                          "flex-1 text-xs transition-all px-2",
                                          summary.accountantApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                        )}
                                        disabled={(() => {
                                          const user = session?.user as any
                                          const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                          const approvedByOther = summary.approvedByAccountant && summary.approvedByAccountant !== session?.user?.name
                                          const alreadyApprovedAsTreasurer = hasBothPermissions && summary.treasurerApproved && summary.approvedByTreasury === session?.user?.name
                                          return !user?.canApproveAccountant || alreadyApprovedAsTreasurer || approvedByOther
                                        })()}
                                        onClick={() => handleApprovalToggle(summary, 'accountant')}
                                        title="Contador"
                                      >
                                        {summary.accountantApproved ? (
                                          <><Check className="h-3 w-3" /> Contador</>
                                        ) : (
                                          "Contador"
                                        )}
                                      </Button>

                                      {/* Botão Dirigente */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={summary.directorApproved ? "default" : "outline"}
                                        className={cn(
                                          "flex-1 text-xs transition-all px-2",
                                          summary.directorApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                        )}
                                        disabled={!session?.user?.canApproveDirector}
                                        onClick={() => handleApprovalToggle(summary, 'director')}
                                        title="Dirigente"
                                      >
                                        {summary.directorApproved ? (
                                          <><Check className="h-3 w-3" />Dirigente</>
                                        ) : (
                                          "Dirigente"
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={summary.status === 'APPROVED' ? 'default' : 'secondary'}>
                                      {summary.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {session.user?.canDeleteSummary && (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDeleteSummary(summary.id)}
                                          disabled={summary.status === 'APPROVED'}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditSummary(summary)}
                                      >
                                        Editar
                                      </Button>
                                      {session.user?.canGenerateReport && (
                                        <Button variant="outline" size="sm" onClick={() => handlePrintSummary(summary)}>
                                          <Printer className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* MUDANÇA 3: Cards para Mobile */}
                        <div className="md:hidden space-y-2">
                          {summaries.map((summary) => (
                            <Card key={summary.id} className="border-l-1">
                              <CardHeader className="py-1">
                                <CardTitle className="text-base flex justify-between items-center">
                                  {/* Nome da Congregação (assumindo que você adicione esta informação ao tipo Summary) */}
                                  <span className="text-gray-700 font-semibold">
                                    {/* {congregations.find(c => c.id === selectedCongregations[0])?.name || "Resumo"} */}
                                    {congregations.find(c => c.id === (summary as any).congregationId)?.name || "Resumo"}
                                  </span>
                                  <Badge variant={summary.status === 'APPROVED' ? 'default' : 'secondary'}>
                                    {summary.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                                  </Badge>
                                </CardTitle>
                                <CardDescription className="text-sm mb-[-20]">
                                  {formatDate(new Date(summary.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                                  {formatDate(new Date(summary.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>Dízimo:</span>
                                  <span className="font-medium text-blue-600">
                                    R$ {(summary.titheTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Oferta do Culto:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {(summary.offerTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>EBD:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {(summary.ebdTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {/* <div className="flex justify-between">
                                <span>Carne Reviver:</span>
                                <span className="font-medium text-green-600">
                                    R$ {(summary.carneReviverTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>                             */}
                                <div className="flex justify-between">
                                  <span>Missão:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {(summary.missionTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Campanha:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {(summary.campaignTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Voto:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {(summary.votesTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {/* <div className="flex justify-between">
                                <span>Círculo:</span>
                                <span className="font-medium text-green-600">
                                    R$ {(summary.circleTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>                                                         */}
                                <div className="flex justify-between">
                                  <span>Saída:</span>
                                  <span className="font-medium text-red-600">
                                    R$ {(summary.exitTotal ?? 0.00).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="pt-2 border-t">
                                  <h4 className="font-medium mb-1">Aprovações:</h4>
                                  <div className="flex flex-row gap-1 mb-4">
                                    {/* Botão Tesoureiro */}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={summary.treasurerApproved ? "default" : "outline"}
                                      className={cn(
                                        "flex-1 text-xs transition-all px-2",
                                        summary.treasurerApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                      )}
                                      disabled={(() => {
                                        const user = session?.user as any
                                        const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                        const approvedByOther = summary.approvedByTreasury && summary.approvedByTreasury !== session?.user?.name
                                        const alreadyApprovedAsAccountant = hasBothPermissions && summary.accountantApproved && summary.approvedByAccountant === session?.user?.name
                                        return !user?.canApproveTreasury || alreadyApprovedAsAccountant || approvedByOther
                                      })()}
                                      onClick={() => handleApprovalToggle(summary, 'treasurer')}
                                      title="Tes"
                                    >
                                      {summary.treasurerApproved ? (
                                        <><Check className="h-3 w-3" />Tes</>
                                      ) : (
                                        "Tes"
                                      )}
                                    </Button>

                                    {/* Botão Contador */}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={summary.accountantApproved ? "default" : "outline"}
                                      className={cn(
                                        "flex-1 text-xs transition-all px-2",
                                        summary.accountantApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                      )}
                                      disabled={(() => {
                                        const user = session?.user as any
                                        const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                        const approvedByOther = summary.approvedByAccountant && summary.approvedByAccountant !== session?.user?.name
                                        const alreadyApprovedAsTreasurer = hasBothPermissions && summary.treasurerApproved && summary.approvedByTreasury === session?.user?.name
                                        return !user?.canApproveAccountant || alreadyApprovedAsTreasurer || approvedByOther
                                      })()}
                                      onClick={() => handleApprovalToggle(summary, 'accountant')}
                                      title="Cont"
                                    >
                                      {summary.accountantApproved ? (
                                        <><Check className="h-3 w-3" />Cont</>
                                      ) : (
                                        "Cont"
                                      )}
                                    </Button>

                                    {/* Botão Dirigente */}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={summary.directorApproved ? "default" : "outline"}
                                      className={cn(
                                        "flex-1 text-xs transition-all px-2",
                                        summary.directorApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                      )}
                                      disabled={!session?.user?.canApproveDirector}
                                      onClick={() => handleApprovalToggle(summary, 'director')}
                                      title="Dir"
                                    >
                                      {summary.directorApproved ? (
                                        <><Check className="h-3 w-3" />Dir</>
                                      ) : (
                                        "Dir"
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex justify-between space-x-2 pt-3 border-t">
                                  {session.user?.canDeleteSummary && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteSummary(summary.id)}
                                      disabled={summary.status === 'APPROVED'}
                                    // className="w-full"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditSummary(summary)}
                                  // className="w-full"
                                  >
                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
          {/* Diálogo de Edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto h-[90vh]">
              <DialogHeader>
                <DialogTitle>Editar Resumo</DialogTitle>
                <DialogDescription className="sr-only">
                  Edite os detalhes do resumo e visualize os lançamentos associados.
                </DialogDescription>
              </DialogHeader>

              {/* Wrapper principal: mantém header + footer fixos e área de conteúdo rolável */}
              <div className="flex flex-col flex-1 min-h-0">
                {/* Tabs header (sempre visível) */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summaries" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Resumo
                    </TabsTrigger>
                    <TabsTrigger value="launches" className="flex items-center" disabled={!selectedSummary}>
                      <List className="mr-2 h-4 w-4" />
                      Lancam.
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center" disabled={!selectedSummary}>
                      <List className="mr-2 h-4 w-4" />
                      Logs
                    </TabsTrigger>
                  </TabsList>

                  {/* Área rolável: ocupa o espaço restante entre header e footer */}
                  <div className="flex-1 min-h-0 overflow-y-auto pt-0 pb-4">
                    <TabsContent value="summaries" className="min-h-0">
                      <div className="space-y-2 py-0">
                        {/* Totais */}
                        {editFormData && (
                          <div className="pt-0 mt-0">
                            {/* <h4 className="font-medium mb-0">Totais</h4> */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-0 justify-between">
                                {/* Mostrar cards baseado no tipo de resumo */}
                                <div className="flex flex-col gap-0">
                                  {editFormData.summaryType === 'PADRAO' && (
                                    <>
                                      {/* CARD DE DÍZIMOS */}
                                      <div className="bg-blue-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-blue-700">Dízimo</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.titheTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>

                                      {/* CARD DE OFFERTA DE CULTO*/}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Oferta do Culto</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.offerTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>

                                      {/* CARD DE EBD*/}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">EBD</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.ebdTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>


                                      {/* CARD DE MISSAO */}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Missão</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.missionTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>

                                      {/* CARD DE CAMPANHA*/}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Campanha</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.campaignTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>

                                      {/* CARD DE VOTOS*/}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Voto</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.votesTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>

                                    </>
                                  )}

                                  {editFormData.summaryType === 'CARNE_REVIVER' && (
                                    <>
                                      {/* CARD DE CARNE REVIVER */}
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Carnê Reviver</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.carneReviverTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {editFormData.summaryType === 'CIRCULO' && (
                                    <>
                                      {/* CARD DE CIRCULO */}
                                      <div className="bg-yellow-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-yellow-700">Círculo de Oração</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.circleTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Se não houver tipo definido, mostrar todos (compatibilidade com resumos antigos) */}
                                  {!editFormData.summaryType && (
                                    <>
                                      <div className="bg-blue-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-blue-700">Dízimo</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.titheTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Oferta do Culto</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.offerTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">EBD</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.ebdTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-orange-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-orange-700">Missão</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.missionTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Campanha</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.campaignTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-green-700">Voto</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.votesTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="bg-yellow-50 p-1 rounded-lg flex justify-between items-center">
                                        <h5 className="font-medium text-yellow-700">Círculo de Oração</h5>
                                        <div className="text-sm font-semibold flex justify-end">
                                          R$ {Number(editFormData.circleTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* CARD TOTAL DE ENTRADAS - sempre no final, alinhado com Saldo Geral */}
                                <div className="bg-blue-100 p-1 rounded-lg border-2 border-blue-300 mt-auto">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-bold font-small text-blue-800">Tot Entradas</h5>
                                    <div className="text-sm font-extrabold text-blue-800">
                                      {(() => {
                                        let totalEntradas = 0
                                        if (editFormData.summaryType === 'PADRAO') {
                                          totalEntradas = Number(editFormData.titheTotal ?? 0) + Number(editFormData.offerTotal ?? 0) + Number(editFormData.votesTotal ?? 0) + Number(editFormData.ebdTotal ?? 0) + Number(editFormData.campaignTotal ?? 0) + Number(editFormData.missionTotal ?? 0)
                                          // } else if (editFormData.summaryType === 'MISSAO') {
                                          //   totalEntradas = Number(editFormData.missionTotal ?? 0)
                                        } else if (editFormData.summaryType === 'CARNE_REVIVER') {
                                          totalEntradas = Number(editFormData.carneReviverTotal ?? 0)
                                        } else if (editFormData.summaryType === 'CIRCULO') {
                                          totalEntradas = Number(editFormData.circleTotal ?? 0)
                                        } else {
                                          // Compatibilidade com resumos antigos
                                          totalEntradas = Number(editFormData.titheTotal ?? 0) + Number(editFormData.offerTotal ?? 0) + Number(editFormData.votesTotal ?? 0) + Number(editFormData.ebdTotal ?? 0) + Number(editFormData.campaignTotal ?? 0) + Number(editFormData.missionTotal ?? 0) + Number(editFormData.circleTotal ?? 0)
                                        }
                                        return `R$ ${totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* ⭐️ COLUNA DIREITA: SAÍDAS E TOTAIS FINAIS ⭐️ */}
                              <div className="flex flex-col gap-1 justify-between">
                                <div className="flex flex-col gap-1">
                                  {/* 3. CARD TOTAL DE SAÍDAS */}
                                  <div className="bg-red-50 p-1 rounded-lg flex justify-between items-center md:mb-33">
                                    <h5 className="font-medium text-red-700">Saídas</h5>
                                    <div className="text-sm font-semibold ">
                                      R$ {Number(editFormData.exitTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>

                                {/* ⭐️ NOVO: CARD TOTAL GERAL (Entrada - Saída) ⭐️ */}
                                <div className="bg-purple-100 p-1 rounded-lg border-2 border-purple-300 mt-auto">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-bold text-purple-800">Saldo Geral</h5>
                                    <div className="text-sm font-extrabold text-purple-800">
                                      {/* Calcula total de entradas baseado no tipo - Saída */}
                                      R$ {(() => {
                                        let totalEntradas = 0
                                        if (editFormData.summaryType === 'PADRAO') {
                                          totalEntradas = Number(editFormData.titheTotal ?? 0) + Number(editFormData.offerTotal ?? 0) + Number(editFormData.votesTotal ?? 0) + Number(editFormData.ebdTotal ?? 0) + Number(editFormData.campaignTotal ?? 0) + Number(editFormData.missionTotal ?? 0)
                                          // } else if (editFormData.summaryType === 'MISSAO') {
                                          //   totalEntradas = Number(editFormData.missionTotal ?? 0)
                                        } else if (editFormData.summaryType === 'CARNE_REVIVER') {
                                          totalEntradas = Number(editFormData.carneReviverTotal ?? 0)
                                        } else if (editFormData.summaryType === 'CIRCULO') {
                                          totalEntradas = Number(editFormData.circleTotal ?? 0)
                                        } else {
                                          // Compatibilidade com resumos antigos
                                          totalEntradas = Number(editFormData.titheTotal ?? 0) + Number(editFormData.offerTotal ?? 0) + Number(editFormData.votesTotal ?? 0) + Number(editFormData.ebdTotal ?? 0) + Number(editFormData.campaignTotal ?? 0) + Number(editFormData.missionTotal ?? 0) + Number(editFormData.circleTotal ?? 0)
                                        }
                                        return (totalEntradas - Number(editFormData.exitTotal ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-2'> */}

                      {/* <div className='col-span-1'>
                            <Label htmlFor="talonNumber">Nr. Talão</Label>
                            <Input
                              id="talonNumber"
                              name="talonNumber"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editFormData.talonNumber}
                              onChange={handleInputChange}
                              required
                              disabled={editFormData.status === 'APPROVED'}
                            />
                        </div> */}

                      {/* <div>
                        <Label htmlFor="depositValue">Valor Depósito</Label>
                        <NumericFormat
                            id="depositValue"
                            name="depositValue"
                            inputMode="decimal"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editFormData.depositValue ?? ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setEditFormData(prev => ({ ...prev, depositValue: floatValue ?? null }))
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            allowNegative={true}
                            disabled={editFormData.status === 'APPROVED'}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cashValue">Valor Espécie</Label>
                          <NumericFormat
                              id="cashValue"
                              name="cashValue"
                              inputMode="decimal"
                              className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={editFormData.cashValue ?? ''}
                              onValueChange={(values) => {
                                const { floatValue } = values;
                                setEditFormData(prev => ({ ...prev, cashValue: floatValue ?? null }))
                              }}
                              thousandSeparator="."
                              decimalSeparator=","
                              allowNegative={true}
                              disabled={editFormData.status === 'APPROVED'}                              
                            />  
                        </div> */}
                      {/* </div> */}

                      {/* ⭐️ NOVO: CARD TOTAL DE DEPÓSITO + ESPÉCIE ⭐️ */}
                      {/* <div className="bg-yellow-50 p-1 rounded-lg mt-2">
                          <div className="flex justify-between items-center">
                            <h5 className="font-small text-yellow-700">Total Depósito + Espécie</h5>
                            <div className="text-sm font-semibold text-yellow-800">
                              
                              R$ {totalDepositadoEspecie.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>  */}

                      <div className="space-y-2">
                        {/* <h4 className="font-medium">Aprovações</h4> */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-1">
                          {/* Botão Tesoureiro */}
                          <div className="flex flex-col gap-0">
                            {/* <Label>Tesoureiro</Label> */}
                            <Button
                              type="button"
                              // Se aprovado, usa a cor verde. Se não, usa o estilo 'outline'
                              variant={editFormData.treasurerApproved ? "default" : "outline"}
                              className={cn(
                                "w-full transition-all",
                                editFormData.treasurerApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                              )}
                              // Desabilita se:
                              // - usuário não tem permissão OU
                              // - usuário tem ambas as permissões e já aprovou como Contador (só pode aprovar uma) OU
                              // - tesoureiro já está aprovado por outro usuário (só o próprio pode desmarcar)
                              disabled={(() => {
                                const user = session?.user as any
                                const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                const approvedByOther = editFormData.approvedByTreasury && editFormData.approvedByTreasury !== session?.user?.name
                                const alreadyApprovedAsAccountant = hasBothPermissions && editFormData.accountantApproved && editFormData.approvedByAccountant === session?.user?.name

                                return !user?.canApproveTreasury || alreadyApprovedAsAccountant || approvedByOther
                              })()}
                              onClick={() => {
                                const isApproving = !editFormData.treasurerApproved;
                                // Se está desaprovando e não foi o próprio usuário que aprovou, não permitir
                                if (!isApproving && editFormData.approvedByTreasury && editFormData.approvedByTreasury !== session?.user?.name) {
                                  alert('Apenas o usuário que aprovou pode desmarcar a aprovação.');
                                  return;
                                }
                                setEditFormData(prev => ({
                                  ...prev, // Mantém todos os outros dados (incluindo aprovação do contador)
                                  treasurerApproved: isApproving,
                                  approvedByTreasury: isApproving ? (session?.user?.name || '') : '',
                                  approvedAtTreasury: isApproving ? new Date().toISOString() : ''
                                }));
                              }}
                            >
                              {editFormData.treasurerApproved ? (
                                <><Check className="mr-2 h-4 w-4" /> Tesoureiro</>
                              ) : (
                                "Aprovar Tesoureiro"
                              )}
                            </Button>
                          </div>

                          {/* Botão Contador */}
                          <div className="flex flex-col gap-0">
                            {/* <Label>Contador</Label> */}
                            <Button
                              type="button"
                              variant={editFormData.accountantApproved ? "default" : "outline"}
                              className={cn(
                                "w-full transition-all",
                                editFormData.accountantApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                              )}
                              // Desabilita se:
                              // - usuário não tem permissão OU
                              // - usuário tem ambas as permissões e já aprovou como Tesoureiro (só pode aprovar uma) OU
                              // - contador já está aprovado por outro usuário (só o próprio pode desmarcar)
                              disabled={(() => {
                                const user = session?.user as any
                                const hasBothPermissions = user?.canApproveTreasury && user?.canApproveAccountant
                                const approvedByOther = editFormData.approvedByAccountant && editFormData.approvedByAccountant !== session?.user?.name
                                const alreadyApprovedAsTreasurer = hasBothPermissions && editFormData.treasurerApproved && editFormData.approvedByTreasury === session?.user?.name

                                return !user?.canApproveAccountant || alreadyApprovedAsTreasurer || approvedByOther
                              })()}
                              onClick={() => {
                                const isApproving = !editFormData.accountantApproved;
                                // Se está desaprovando e não foi o próprio usuário que aprovou, não permitir
                                if (!isApproving && editFormData.approvedByAccountant && editFormData.approvedByAccountant !== session?.user?.name) {
                                  alert('Apenas o usuário que aprovou pode desmarcar a aprovação.');
                                  return;
                                }
                                setEditFormData(prev => ({
                                  ...prev, // Mantém todos os outros dados (incluindo aprovação do tesoureiro)
                                  accountantApproved: isApproving,
                                  approvedByAccountant: isApproving ? (session?.user?.name || '') : '',
                                  approvedAtAccountant: isApproving ? new Date().toISOString() : ''
                                }));
                              }}
                            >
                              {editFormData.accountantApproved ? (
                                <><Check className="mr-2 h-4 w-4" /> Contador</>
                              ) : (
                                "Aprovar Contador"
                              )}
                            </Button>
                          </div>

                          {/* Botão Dirigente */}
                          <div className="flex flex-col gap-0">
                            {/*<Label>Dirigente</Label>*/}
                            <Button
                              type="button"
                              variant={editFormData.directorApproved ? "default" : "outline"}
                              className={cn(
                                "w-full transition-all",
                                editFormData.directorApproved && "bg-green-600 hover:bg-green-700 text-white border-green-700"
                              )}
                              disabled={!session?.user?.canApproveDirector}
                              onClick={() => {
                                const isApproving = !editFormData.directorApproved;
                                setEditFormData(prev => ({
                                  ...prev, // Mantém todos os outros dados (incluindo aprovação do tesoureiro)
                                  directorApproved: isApproving,
                                  approvedByDirector: isApproving ? (session?.user?.name || '') : '',
                                  approvedAtDirector: isApproving ? new Date().toISOString() : ''
                                }));
                              }}
                            >
                              {editFormData.directorApproved ? (
                                <><Check className="mr-2 h-4 w-4" /> Dirigente</>
                              ) : (
                                "Aprovar Dirigente"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>


                    {/* Aba de Lançamentos */}
                    <TabsContent value="launches" className="max-w-[300px] md:max-w-[600px] max-h-[50vh] h-[50vh] min-h-0">
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
                                  {formatDate(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <div className={`w-full py-1 px-0 rounded text-center text-white font-medium ${launch.type === 'DIZIMO' ? 'bg-blue-500' :
                                    launch.type === 'OFERTA_CULTO' ? 'bg-green-500' :
                                      launch.type === 'CARNE_REVIVER' ? 'bg-green-500' :
                                        launch.type === 'VOTO' ? 'bg-green-500' :
                                          launch.type === 'EBD' ? 'bg-green-500' :
                                            launch.type === 'CAMPANHA' ? 'bg-green-500' :
                                              launch.type === 'SAIDA' ? 'bg-red-500' :
                                                launch.type === 'MISSAO' ? 'bg-green-500' :
                                                  launch.type === 'CIRCULO' ? 'bg-green-500' : ''
                                    }`}>
                                    {launch.type === 'DIZIMO' ? 'Dízimo' :
                                      launch.type === 'OFERTA_CULTO' ? 'Oferta de Culto' :
                                        launch.type === 'CARNE_REVIVER' ? 'Carne Reviver' :
                                          launch.type === 'VOTO' ? 'Voto' :
                                            launch.type === 'EBD' ? 'EBD' :
                                              launch.type === 'CAMPANHA' ? 'Campanha' :
                                                launch.type === 'SAIDA' ? 'Saída' :
                                                  launch.type === 'MISSAO' ? 'Missão' :
                                                    launch.type === 'CIRCULO' ? 'Círculo de Oração' : ''}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  R$ {(
                                    (launch.value) || 0
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
                    <TabsContent value="logs" className="max-w-[300px] md:max-w-[600px] max-h-[50vh] h-[50vh] min-h-0">
                      <div className="space-y-3">
                        {/* Informações de Congregação e Período */}
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                          <div className="flex justify-between items-center">
                            {/* <span className="font-small text-gray-700">Congregação:</span> */}
                            <span className="text-gray-900 font-semibold">
                              {congregations.find(c => c.id === editFormData.congregationId)?.name || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-start items-center">
                            <span className="font-small text-gray-700">Período:</span>
                            <span className="text-gray-900 font-semibold">
                              {editFormData.startDate && editFormData.endDate
                                ? `${editFormData.startDate.substring(8, 10)}/${editFormData.startDate.substring(5, 7)}/${editFormData.startDate.substring(0, 4)}`
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Tabela de Logs */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ação</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Data/Hora</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Inclusão</TableCell>
                                <TableCell>{editFormData?.createdBy || 'N/A'}</TableCell>
                                <TableCell>{editFormData?.createdAt ? formatDate(utcToZonedTime(new Date(editFormData.createdAt), USER_TIMEZONE), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Tesoureiro</TableCell>
                                <TableCell>{editFormData?.approvedByTreasury || '-'}</TableCell>
                                <TableCell>{editFormData?.approvedAtTreasury ? formatDate(utcToZonedTime(new Date(editFormData.approvedAtTreasury), USER_TIMEZONE), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Contador</TableCell>
                                <TableCell>{editFormData?.approvedByAccountant || '-'}</TableCell>
                                <TableCell>{editFormData?.approvedAtAccountant ? formatDate(utcToZonedTime(new Date(editFormData.approvedAtAccountant), USER_TIMEZONE), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Dirigente</TableCell>
                                <TableCell>{editFormData?.approvedByDirector || '-'}</TableCell>
                                <TableCell>{editFormData?.approvedAtDirector ? formatDate(utcToZonedTime(new Date(editFormData.approvedAtDirector), USER_TIMEZONE), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>

                <DialogFooter className="mt-auto mt-[-8]">
                  {session.user?.canReportSummary && editFormData.summaryId && (
                    <Button className="mb-2" variant="outline" size="sm" onClick={() => handlePrintSummary(editFormData.summaryId)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateSummary}>
                    Salvar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Botão flutuante de voltar ao topo - apenas mobile */}
      {pageYPosition > 10 && (
        <a
          href="#container"
          style={{
            position: "fixed",
            bottom: "80px",
            right: "15px",
            background: "#333",
            color: "white",
            padding: "10px 15px",
            borderRadius: "5px",
            textDecoration: "none",
            zIndex: 40,
          }}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <ArrowUp className="h-6 w-6" />
        </a>)}
    </div>
  )
}
