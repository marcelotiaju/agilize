'use client'

import { useState, useEffect, useMemo, useReducer } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search, Check, X, AlertCircle, Tooltip as LucideTooltip, CalendarIcon, User } from 'lucide-react'
import { format } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Pagination } from '@/components/ui/pagination'
import { NumericFormat } from 'react-number-format';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Get the user's timezone
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Launches() {
  const { data: session } = useSession()
  const [launches, setLaunches] = useState<Launch[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [expandedCard, setExpandedCard] = useState(null)
  // Estados para paginação e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCongregation, setSelectedCongregation] = useState('all')

  // Por padrão, definir data inicial e final como data atual
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Tipos
  type Congregation = { id: string; name: string }
  type Contributor = { id: string; name: string; cpf: string; congregationId: string; ecclesiasticalPosition: string, photoUrl: string, photoExists: boolean }
  type Supplier = { id: string; razaoSocial: string; cpfcnpj: string }
  type Classification = { id: string; description: string }

  type Launch = {
    id: string
    congregationId: string
    type: string
    date: Date
    talonNumber?: string
    value?: number
    description?: string
    status: string
    exported?: boolean
    congregation?: { id: string; name: string }
    contributorId?: string
    contributor?: { id: string; name: string; congregationId: string; ecclesiasticalPosition: string, photoUrl: string }
    contributorName?: string
    supplierId?: string
    supplier?: { id: string; razaoSocial: string; cpfcnpj: string }
    supplierName?: string
    classificationId?: string
    classification?: { id: string; name: string }
    approved?: boolean
    summaryId?: string
  }

  // Permissões (mantém nomes existentes)
  const canLaunchVote = session?.user?.canLaunchVote
  const canLaunchEbd = session?.user?.canLaunchEbd
  const canLaunchCampaign = session?.user?.canLaunchCampaign
  const canLaunchTithe = session?.user?.canLaunchTithe
  const canLaunchExpense = session?.user?.canLaunchExpense
  const canLaunchMission = session?.user?.canLaunchMission
  const canLaunchCircle = session?.user?.canLaunchCircle
  const canLaunchServiceOffer = session?.user?.canLaunchServiceOffer
  const canApproveVote = session?.user?.canApproveVote
  const canApproveEbd = session?.user?.canApproveEbd
  const canApproveCampaign = session?.user?.canApproveCampaign
  const canApproveTithe = session?.user?.canApproveTithe
  const canApproveExpense = session?.user?.canApproveExpense
  const canApproveMission = session?.user?.canApproveMission
  const canApproveCircle = session?.user?.canApproveCircle
  const canApproveServiceOffer = session?.user?.canApproveServiceOffer

  const [editingLaunch, setEditingLaunch] = useState<Launch | null>(null)
  const [formData, setFormData] = useState({
    congregationId: '',
    type: 'DIZIMO',
    date: format(new Date(), 'yyyy-MM-dd'),
    talonNumber: '',
    value: '',
    description: '',
    contributorId: '',
    contributorName: '',
    isContributorRegistered: false,
    supplierId: '',
    supplierName: '',
    isSupplierRegistered: false,
    classificationId: '',
    summaryId: '',
  })

  useEffect(() => {
    fetchLaunches()
    fetchCongregations()
    fetchContributors()
    fetchSuppliers()
    fetchClassifications()
  }, [currentPage, itemsPerPage, searchTerm, selectedCongregation, startDate, endDate])

  useEffect(() => {
    // Se houver apenas uma congregação, definir como default
    if (congregations.length === 1) {
      setFormData(prev => ({
        ...prev,
        congregationId: congregations[0].id
      }))
    }
  }, [congregations])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Resetar para a primeira página
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Resetar para a primeira página ao pesquisar
    fetchLaunches()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCongregation('all')
    setCurrentPage(1)
  }

  const fetchLaunches = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      if (searchTerm) params.append('searchTerm', searchTerm)
      if (selectedCongregation !== 'all') params.append('congregationId', selectedCongregation)
      params.append('timezone', USER_TIMEZONE)

      if (startDate) {
        const s = new Date(startDate)
        s.setHours(0, 0, 0, 0)
        const startUtc = zonedTimeToUtc(s, USER_TIMEZONE)
        params.append('startDate', startUtc.toISOString())
      }
      if (endDate) {
        const e = new Date(endDate)
        e.setHours(23, 59, 59, 999)
        const endUtc = zonedTimeToUtc(e, USER_TIMEZONE)
        params.append('endDate', endUtc.toISOString())
      }

      const response = await fetch(`/api/launches?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLaunches(data.launches)
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.totalCount)
      }
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
      setError('Erro ao carregar lançamentos. Tente novamente.')
    }
  }

  const fetchCongregations = async () => {
    try {
      const response = await fetch('/api/congregations')
      if (response.ok) {
        const data = await response.json()
        setCongregations(data)
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error)
      setError('Erro ao carregar congregações.')
    }
  }

  const fetchContributors = async () => {
    try {
      const response = await fetch(`/api/contributors`)
      if (response.ok) {
        const data = await response.json()
        setContributors(data)
      }
    } catch (error) {
      console.error('Erro ao carregar contribuintes:', error)
      setError('Erro ao carregar contribuintes.')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
      setError('Erro ao carregar fornecedores.')
    }
  }

  const fetchClassifications = async () => {
    try {
      const response = await fetch('/api/classifications')
      if (response.ok) {
        const data = await response.json()
        setClassifications(data)
      }
    } catch (error) {
      console.error('Erro ao carregar classificações:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target

    if (name === 'talonNumber') {
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: numericValue }))
      return
    }

    if (name === 'value') {
      // aceitar apenas números e separadores
      const numericValue = value.replace(/[^\d.,]/g, '')
      const formattedValue = numericValue.replace(/,/g, '.')
      setFormData(prev => ({ ...prev, [name]: formattedValue }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSalvando(true)

    // Validações
    if (formData.type === 'DIZIMO' && !formData.contributorName && !formData.contributorId) {
      setError('Nome do contribuinte é obrigatório para lançamentos do tipo Dízimo')
      setSalvando(false)
      return
    }

    // Todos os tipos agora usam campo único "value" (exceto quando a regra específica difere)
    const numericValue = parseFloat(formData.value as any)
    if (['VOTO', 'EBD', 'CAMPANHA', 'DIZIMO', 'SAIDA', 'OFERTA_CULTO', 'MISSAO', 'CIRCULO'].includes(formData.type)) {
      if (!numericValue || Number.isNaN(numericValue)) {
        setError('O campo Valor deve ser preenchido.')
        setSalvando(false)
        return
      }
    }
    //var opcoesFormatacao = { timeZone: USER_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    //formData.date = formData.date.toLocaleString('pt-BR', opcoesFormatacao).split('/').reverse().join('-');

    try {
      const url = editingLaunch ? `/api/launches/${editingLaunch.id}` : '/api/launches'
      const method = editingLaunch ? 'PUT' : 'POST'

      // enviar value como número
      const bodyToSend = {
        ...formData,
        value: Number(parseFloat(formData.value as any) || 0)
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend)
      })

      if (response.ok) {
        fetchLaunches()
        setIsDialogOpen(false)
        resetForm()
        setSalvando(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar lançamento')
        setSalvando(false)
      }
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error)
      alert('Erro ao salvar lançamento')
      setSalvando(false)
    }
  }

  const handleEdit = (launch: Launch) => {
    setEditingLaunch(launch)
    // compatibilidade: usar launch.value ou fallback para antigos campos se existirem
    //const fallbackValue = (launch as any).value ?? (launch as any).votesValue ?? (launch as any).ebdValue ?? (launch as any).campaignValue ?? (launch as any).offerValue ?? ''
    setFormData({
      congregationId: launch.congregationId,
      type: launch.type,
      date: format(new Date(launch.date), 'yyyy-MM-dd'),
      talonNumber: launch.talonNumber || '',
      value: launch.value?.toString() || '',
      description: launch.description || '',
      contributorId: launch.contributorId?.toString() || '',
      contributorName: launch.contributorName || '',
      isContributorRegistered: !!launch.contributorId,
      supplierId: launch.supplierId?.toString() || '',
      supplierName: launch.supplierName || '',
      isSupplierRegistered: !!launch.supplierId,
      classificationId: launch.classificationId || '',
      summaryId: launch.summaryId || '',
    })
    setIsDialogOpen(true)
  }

  const handleCancel = async (id: string) => {
    setError(null)
    try {
      const launch = launches.find(l => l.id === id)

      if (launch?.status !== 'NORMAL') {
        setError(`Apenas lançamentos com status Normal podem ser cancelados. Status atual: ${launch?.status}`)
        return
      }

      const response = await fetch(`api/launches/status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'CANCELED' }),
      })

      if (response.ok) fetchLaunches()
      else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao cancelar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao cancelar lançamento:', error)
      setError('Erro ao cancelar lançamento. Tente novamente.')
    }
  }

  const handleApprove = async (id: string) => {
    setError(null)
    try {
      const launch = launches.find(l => l.id === id)

      if (launch?.status !== 'NORMAL') {
        setError(`Apenas lançamentos com status Normal podem ser aprovados. Status atual: ${launch?.status}`)
        return
      }
      const response = await fetch(`/api/launches/status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'APPROVED' }),
      })

      if (response.ok) fetchLaunches()
      else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao aprovar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao aprovar lançamento:', error)
      setError('Erro ao aprovar lançamento. Tente novamente.')
    }
  }

  const handleReprove = async (id: string) => {
    setError(null)
    try {
      const launch = launches.find(l => l.id === id)

      if (launch?.status !== 'APPROVED') {
        setError(`Apenas lançamentos com status Aprovado podem ser reprovados. Status atual: ${launch?.status}`)
        return
      }

      const response = await fetch(`/api/launches/status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'NORMAL' }),
      })

      if (response.ok) fetchLaunches()
      else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao desaprovar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao desaprovar lançamento:', error)
      setError('Erro ao desaprovar lançamento. Tente novamente.')
    }
  }

  const resetForm = () => {
    setEditingLaunch(null)
    setFormData({
      congregationId: congregations.length === 1 ? congregations[0].id : '',
      type: 'DIZIMO',
      date: format(new Date(), 'yyyy-MM-dd'),
      talonNumber: '',
      value: '',
      description: '',
      contributorId: '',
      contributorName: '',
      isContributorRegistered: false,
      supplierId: '',
      supplierName: '',
      isSupplierRegistered: false,
      classificationId: '',
      summaryId: '',
    })
    setError(null)
  }

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === '') return 'R$ 0,00'
    const numValue = parseFloat(value)
    if (Number.isNaN(numValue)) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numValue)
  }

  const filteredContributors = contributors.filter(c =>
    !formData.congregationId || c.congregationId === formData.congregationId
  )

  const LaunchCard = ({ launch }) => (
    <Card key={launch.id} className="mb-2">
      <CardContent className="p-4 pt-0.5">
        <div className="flex justify-between items-start mb-1">
          <div className={`px-3 py-1 rounded text-white text-sm font-medium ${
            launch.type === 'VOTO' ? 'bg-green-500' :
            launch.type === 'EBD' ? 'bg-teal-500' :
            launch.type === 'CAMPANHA' ? 'bg-indigo-500' :
            launch.type === 'DIZIMO' ? 'bg-blue-500' :
            launch.type === 'SAIDA' ? 'bg-red-500' :
            launch.type === 'MISSAO' ? 'bg-orange-500' :
            launch.type === 'OFERTA_CULTO' ? 'bg-purple-500' :
            launch.type === 'CIRCULO' ? 'bg-yellow-500' : ''
          }`}>
            {launch.type === 'VOTO' ? 'Voto' :
             launch.type === 'EBD' ? 'EBD' :
             launch.type === 'CAMPANHA' ? 'Campanha' :
             launch.type === 'DIZIMO' ? 'Dízimo' :
             launch.type === 'SAIDA' ? 'Saída' :
             launch.type === 'MISSAO' ? 'Missão' :
             launch.type === 'OFERTA_CULTO' ? 'Oferta do Culto' :
             launch.type === 'CIRCULO' ? 'Círculo de Oração' : ''}
          </div>
          <Badge variant={
            launch.status === 'NORMAL' ? 'default' :
            launch.status === 'APPROVED' ? 'default' :
            launch.status === 'EXPORTED' ? 'secondary' : 'destructive'
          }>
            {launch.status === 'NORMAL' ? 'Normal' :
             launch.status === 'APPROVED' ? 'Aprovado' :
             launch.status === 'EXPORTED' ? 'Exportado' : 'Cancelado'}
          </Badge>
        </div>

        <div className="space-y-1 mb-1">
          <div className="flex items-center text-sm font-normal">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {format(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}
          </div>

          <div className="text-sm font-normal">
            <div>{formatCurrency(launch.value)}</div>
          </div>

          {(launch.contributor?.name || launch.contributorName || launch.supplier?.razaoSocial || launch.supplierName) && (
            <div className="flex items-center text-sm font-normal">
              <User className="h-4 w-4 mr-1" />
              {launch.contributor?.name || launch.contributorName || launch.supplier?.razaoSocial || launch.supplierName}
            </div>
          )}
        </div>

        {launch.talonNumber && (
          <div className="flex justify-start">
            <span className="text-sm font-normal">Talão:</span>
            <span className="text-sm font-medium">{launch.talonNumber}</span>
          </div>
        )}
        {launch.description && (
          <div className="flex justify-start">
            <span className="text-sm font-normal">Descrição:</span>
            <span className="text-sm font-medium">{launch.description}</span>
          </div>
        )}
        {launch.classification && (
          <div className="flex justify-between">
            <span className="text-sm font-normal">Classificação:</span>
            <span className="text-sm font-medium">{launch.classification.description}</span>
          </div>
        )}

        <div className="flex space-x-2 pt-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => handleEdit(launch)}>
                <Edit className="h-4 w-4 mr-1" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Editar</p></TooltipContent>
          </Tooltip>

          {launch.status === 'NORMAL' && (
            <>
              {(launch.type === 'VOTO' && canApproveVote) ||
               (launch.type === 'EBD' && canApproveEbd) ||
               (launch.type === 'CAMPANHA' && canApproveCampaign) ||
               (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
               (launch.type === 'DIZIMO' && canApproveTithe) ||
               (launch.type === 'SAIDA' && canApproveExpense) ||
               (launch.type === 'MISSAO' && canApproveMission) ||
               (launch.type === 'CIRCULO' && canApproveCircle) ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleApprove(launch.id)}><Check className="h-4 w-4 mr-1" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Aprovar</p></TooltipContent>
                </Tooltip>
              ) : null}
            </>
          )}

          {launch.status === 'APPROVED' && (
            <>
              {(launch.type === 'VOTO' && canApproveVote) ||
               (launch.type === 'EBD' && canApproveEbd) ||
               (launch.type === 'CAMPANHA' && canApproveCampaign) ||
               (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
               (launch.type === 'DIZIMO' && canApproveTithe) ||
               (launch.type === 'SAIDA' && canApproveExpense) ||
               (launch.type === 'MISSAO' && canApproveMission) ||
               (launch.type === 'CIRCULO' && canApproveCircle) ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleReprove(launch.id)}><X className="h-4 w-4 mr-1" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Desaprovar</p></TooltipContent>
                </Tooltip>
              ) : null}
            </>
          )}

          {launch.status == 'NORMAL' && (canLaunchVote || canLaunchEbd || canLaunchCampaign || canLaunchExpense || canLaunchTithe || canLaunchMission || canLaunchCircle || canLaunchServiceOffer) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleCancel(launch.id)}><Trash2 className="h-4 w-4 mr-1" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Cancelar</p></TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <PermissionGuard
      requiredPermissions={{
        canLaunchVote: canLaunchVote,
        canLaunchEbd: canLaunchEbd,
        canLaunchCampaign: canLaunchCampaign,
        canLaunchTithe: canLaunchTithe,
        canLaunchExpense: canLaunchExpense,
        canLaunchMission: canLaunchMission,
        canLaunchCircle: canLaunchCircle,
        canLaunchServiceOffer: canLaunchServiceOffer,
        canApproveVote: canApproveVote,
        canApproveEbd: canApproveEbd,
        canApproveCampaign: canApproveCampaign,
        canApproveTithe: canApproveTithe,
        canApproveExpense: canApproveExpense,
        canApproveMission: canApproveMission,
        canApproveCircle: canApproveCircle,
        canApproveServiceOffer: canApproveServiceOffer,
      }}
    >

      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <div className="lg:pl-64">
          <div className="p-2">
            <div className="flex justify-end mb-2">
              <div className="flex space-x-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} disabled={!canLaunchVote && !canLaunchEbd && !canLaunchCampaign && !canLaunchTithe && !canLaunchExpense && !canLaunchMission && !canLaunchCircle && !canLaunchServiceOffer}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLaunch ? 'Editar' : 'Novo'}</DialogTitle>
                      <DialogDescription asChild>
                        {editingLaunch && editingLaunch.status !== 'NORMAL' && (
                          <div className="mt-2 p-2 bg-yellow-50 text-red-800 rounded-md flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Este lançamento não pode ser editado porque está com status "{editingLaunch.status === 'CANCELED' ? 'CANCELADO' : editingLaunch.status === 'APPROVED' ? 'APROVADO': editingLaunch.status === 'EXPORTED' ? 'EXPORTADO' : '' }"
                          </div>
                        )}
                      </DialogDescription>
                      <DialogDescription asChild>
                        {editingLaunch && editingLaunch.summaryId != null && (
                          <div className="mt-2 p-2 bg-yellow-50 text-red-800 rounded-md flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Este lançamento faz parte de um resumo e não pode ser alterado."
                          </div>
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-2">
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="congregationId">Congregação</Label>
                          <SearchableSelect
                            label="Buscar Congregação"
                            placeholder="Selecione a Congregação"
                            value={formData.congregationId}
                            disabled={editingLaunch ? (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null) : false}
                            onChange={(value) => handleSelectChange('congregationId', value)}
                            name="congregationId"
                            data={congregations.map(s => ({ id: s.id, name: s.name }))}
                            searchKeys={['name']}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <Label htmlFor="type">Tipo</Label>
                            <Select
                              value={formData.type}
                              onValueChange={(value) => handleSelectChange('type', value)}
                              disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {canLaunchTithe && <SelectItem value="DIZIMO">Dízimos</SelectItem>}
                                {canLaunchServiceOffer && <SelectItem value="OFERTA_CULTO">Oferta do Culto</SelectItem>}
                                {canLaunchVote && <SelectItem value="VOTO">Voto</SelectItem>}
                                {canLaunchEbd && <SelectItem value="EBD">EBD</SelectItem>}
                                {canLaunchCampaign && <SelectItem value="CAMPANHA">Campanha</SelectItem>}
                                {canLaunchMission && <SelectItem value="MISSAO">Missão</SelectItem>}
                                {canLaunchCircle && <SelectItem value="CIRCULO">Círculo de Oração</SelectItem>}
                                {canLaunchExpense && <SelectItem value="SAIDA">Saídas</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>

                          {formData.type === 'SAIDA' && (
                            <div>
                              <Label htmlFor="classificationId">Classificação</Label>
                              <Select
                                key={formData.classificationId}
                                value={formData.classificationId}
                                onValueChange={(value) => handleSelectChange('classificationId', value)}
                                disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma classificação" />
                                </SelectTrigger>
                                <SelectContent>
                                  {classifications.map((classification) => (
                                    <SelectItem key={classification.id} value={classification.id}>
                                      {classification.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="date">Data</Label>
                            <Input
                              id="date"
                              name="date"
                              type="date"
                              value={formData.date ?? ''}
                              onChange={handleInputChange}
                              disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                            />
                          </div>

                          <div>
                            {formData.type === 'SAIDA' ? <Label htmlFor="talonNumber">Nr Doc</Label> : <Label htmlFor="talonNumber">Nr. Talão</Label>}
                            <Input
                              id="talonNumber"
                              name="talonNumber"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={formData.talonNumber ?? ''}
                              onChange={handleInputChange}
                              disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                            />
                          </div>
                        </div>

                        {/* Campo único de valor para todos os tipos */}
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="value">{formData.type === 'VOTO' ? 'Valor Voto' : formData.type === 'EBD' ? 'Valor EBD' : formData.type === 'CAMPANHA' ? 'Valor Campanha' : formData.type === 'OFERTA_CULTO' ? 'Valor Oferta' : 'Valor'}</Label>
                            <NumericFormat
                              id="value"
                              name="value"
                              className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={formData.value ?? ''}
                              onValueChange={(values) => {
                                const { floatValue, value } = values;
                                // armazenar como string normalizada
                                setFormData(prev => ({ ...prev, value: (floatValue !== undefined ? floatValue : value) as any }))
                              }}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="R$ "
                              decimalScale={2}
                              fixedDecimalScale={true}
                              disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                            />
                          </div>
                        </div>

                        {/* Dízimo: contribuinte */}
                        {formData.type === 'DIZIMO' && (
                          <div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isContributorRegistered"
                                name="isContributorRegistered"
                                checked={formData.isContributorRegistered}
                                disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                onCheckedChange={(checked) =>
                                  setFormData(prev => ({ ...prev, isContributorRegistered: checked }))
                                }
                              />
                              <Label htmlFor="isContributorRegistered">Contribuinte cadastrado</Label>
                            </div>

                            {formData.isContributorRegistered ? (
                              <div>
                                <Label htmlFor="contributorId">Contribuinte</Label>
                                <SearchableSelect
                                  key={formData.contributorId}
                                  label="Buscar Contribuinte"
                                  placeholder="Selecione o contribuinte"
                                  value={formData.contributorId ?? ''}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                  onChange={(value) => handleSelectChange('contributorId', value)}
                                  name="contributorId"
                                  data={contributors.filter(f => (f.congregationId == formData.congregationId)).map(c => ({ key: c.id, id: c.id, name: c.name, document: c.cpf, cargo: c.ecclesiasticalPosition, photoUrl: c.photoUrl, photoExists: c.photoExists }))}
                                  searchKeys={['name', 'document']}
                                />
                              </div>
                            ) : (
                              <div>
                                <Label htmlFor="contributorName">Nome do Contribuinte</Label>
                                <Input
                                  id="contributorName"
                                  name="contributorName"
                                  value={formData.contributorName ?? ''}
                                  onChange={handleInputChange}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                  required
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fornecedor para SAIDA */}
                        {['SAIDA'].includes(formData.type) && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isSupplierRegistered"
                                name="isSupplierRegistered"
                                checked={formData.isSupplierRegistered}
                                disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                onCheckedChange={(checked) =>
                                  setFormData(prev => ({ ...prev, isSupplierRegistered: checked }))
                                }
                              />
                              <Label htmlFor="isSupplierRegistered">Fornecedor cadastrado</Label>
                            </div>
                            {formData.isSupplierRegistered ? (
                              <div>
                                <Label htmlFor="supplierId">Fornecedor</Label>
                                <SearchableSelect
                                  key={formData.supplierId}
                                  label="Buscar Fornecedor"
                                  placeholder="Selecione o fornecedor"
                                  value={formData.supplierId ?? ''}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                  onChange={(value) => handleSelectChange('supplierId', value)}
                                  name="supplierId"
                                  data={suppliers.map(s => ({ key: s.id, id: s.id, name: s.razaoSocial, document: s.cpfcnpj }))}
                                  searchKeys={['name', 'document']}
                                />
                              </div>
                            ) : (
                              <div>
                                <Label htmlFor="supplierName">Nome do Fornecedor</Label>
                                <Input
                                  id="supplierName"
                                  name="supplierName"
                                  value={formData.supplierName ?? ''}
                                  onChange={handleInputChange}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                />
                              </div>
                            )}
                          </>
                        )}

                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={formData.description ?? ''}
                            onChange={handleInputChange}
                            disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                          />
                        </div>

                        <DialogFooter>
                          <Button type="submit" disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null) || salvando}>
                            {editingLaunch ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </DialogFooter>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Pesquisar em todos os campos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Data Inicial */}
                <div className="w-full sm:w-44">
                  <Label className="sr-only">Data Inicial</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'Data Inicial'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          setStartDate(d);
                          setStartDateOpen(false);
                          setCurrentPage(1);
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
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'Data Final'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          setEndDate(d);
                          setEndDateOpen(false);
                          setCurrentPage(1);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="w-full sm:w-64">
                <Select value={selectedCongregation} onValueChange={setSelectedCongregation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por congregação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as congregações</SelectItem>
                    {congregations.map((congregation) => (
                      <SelectItem key={congregation.id} value={congregation.id}>
                        {congregation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista Desktop */}
            <div className="hidden lg:block">
              <Card>
                <CardHeader>
                  <CardTitle>Lançamentos Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valores</TableHead>
                          <TableHead>Contribuinte/Fornecedor</TableHead>
                          <TableHead>Nr Doc</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {launches.map((launch) => (
                          <TableRow key={launch.id}>
                            <TableCell>
                              <div className={`w-full py-1 px-0 rounded text-center text-white font-medium ${
                              launch.type === 'DIZIMO' ? 'bg-blue-500' : 
                              launch.type === 'OFERTA_CULTO'? 'bg-green-500' :
                              launch.type === 'VOTO' ? 'bg-green-500' : 
                              launch.type === 'EBD' ? 'bg-green-500' : 
                              launch.type === 'CAMPANHA' ? 'bg-green-500' :                                                             
                              launch.type === 'SAIDA'? 'bg-red-500' :
                              launch.type === 'MISSAO'? 'bg-orange-500' :
                              launch.type === 'OFERTA_CULTO'? 'bg-purple-500' :
                              launch.type === 'CIRCULO'? 'bg-yellow-500' : ''
                            }`}>
                                {launch.type === 'VOTO' ? 'Voto' :
                                 launch.type === 'OFERTA_CULTO' ? 'Oferta do Culto' :
                                 launch.type === 'EBD' ? 'EBD' :
                                 launch.type === 'CAMPANHA' ? 'Campanha' :
                                 launch.type === 'DIZIMO' ? 'Dízimo' :
                                 launch.type === 'SAIDA' ? 'Saída' :
                                 launch.type === 'MISSAO' ? 'Missão' :
                                 launch.type === 'CIRCULO' ? 'Círculo de Oração' : ''}
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(launch.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{formatCurrency(launch.value)}</TableCell>
                            <TableCell>{launch.contributor?.name || launch.supplier?.razaoSocial || launch.contributorName || launch.supplierName || '-'}</TableCell>
                            <TableCell>{launch.talonNumber}</TableCell>
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
                            <TableCell>
                              <div className="flex space-x-2">
                                {(launch.type === 'VOTO' && canLaunchVote) ||
                                  (launch.type === 'EBD' && canLaunchEbd) ||
                                  (launch.type === 'CAMPANHA' && canLaunchCampaign) ||
                                  (launch.type === 'OFERTA_CULTO' && canLaunchServiceOffer) ||
                                  (launch.type === 'DIZIMO' && canLaunchTithe) ||
                                  (launch.type === 'SAIDA' && canLaunchExpense) ||
                                  (launch.type === 'MISSAO' && canLaunchMission) ||
                                  (launch.type === 'CIRCULO' && canLaunchCircle) ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" onClick={() => handleEdit(launch)}><Edit className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Editar</p></TooltipContent>
                                  </Tooltip>
                                ) : null}

                                {launch.status === 'NORMAL' && (
                                  <>
                                    {(launch.type === 'VOTO' && canApproveVote) ||
                                      (launch.type === 'EBD' && canApproveEbd) ||
                                      (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                                      (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                                      (launch.type === 'DIZIMO' && canApproveTithe) ||
                                      (launch.type === 'SAIDA' && canApproveExpense) ||
                                      (launch.type === 'MISSAO' && canApproveMission) ||
                                      (launch.type === 'CIRCULO' && canApproveCircle) ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" size="sm" onClick={() => handleApprove(launch.id)}><Check className="h-4 w-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Aprovar</p></TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </>
                                )}

                                {launch.status === 'APPROVED' && (
                                  <>
                                    {(launch.type === 'VOTO' && canApproveVote) ||
                                      (launch.type === 'EBD' && canApproveEbd) ||
                                      (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                                      (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                                      (launch.type === 'DIZIMO' && canApproveTithe) ||
                                      (launch.type === 'SAIDA' && canApproveExpense) ||
                                      (launch.type === 'MISSAO' && canApproveMission) ||
                                      (launch.type === 'CIRCULO' && canApproveCircle) ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" size="sm" onClick={() => handleReprove(launch.id)}><X className="h-4 w-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Desaprovar</p></TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </>
                                )}

                                {launch.status == 'NORMAL' && (canLaunchVote || canLaunchEbd || canLaunchCampaign || canLaunchExpense || canLaunchTithe || canLaunchMission || canLaunchCircle || canLaunchServiceOffer) ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" onClick={() => handleCancel(launch.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cancelar</p></TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                      onItemsPerPageChange={handleItemsPerPageChange}
                      totalItems={totalCount}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista Mobile */}
            <div className="lg:hidden">
              {launches.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} />
              ))}
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={totalCount}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
