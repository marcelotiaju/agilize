'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Plus, Edit, Trash2, Search, Check, X, AlertCircle, CalendarIcon, User, Users, Ghost, List, ArrowUp, Upload } from 'lucide-react'
import { format, startOfDay } from 'date-fns'
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
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation'
import { PieChart } from 'lucide-react'

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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLaunchType, setImportLaunchType] = useState<'DIZIMO' | 'CARNE_REVIVER'>('DIZIMO')
  const [importCongregationId, setImportCongregationId] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const [expandedCard, setExpandedCard] = useState(null)
  // Estados para paginação e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCongregation, setSelectedCongregation] = useState('all')

  // Por padrão, definir data inicial e final como data atual
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [pageYPosition, setPageYPosition] = useState(0);
  const router = useRouter()
  // Dentro do componente principal no page.tsx
  const [importFilter, setImportFilter] = useState<'ALL' | 'IMPORTED' | 'MANUAL'>('MANUAL');

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
    //approved?: boolean
    summaryId?: string
    createdBy?: String
    cancelledBy?: string
    approvedByTreasury?: boolean
    approvedByAccountant?: boolean
    approvedByDirector?: boolean
    approvedVia?: string
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
  const canLaunchCarneReviver = session?.user?.canLaunchCarneReviver
  const canApproveVote = session?.user?.canApproveVote
  const canApproveEbd = session?.user?.canApproveEbd
  const canApproveCampaign = session?.user?.canApproveCampaign
  const canApproveTithe = session?.user?.canApproveTithe
  const canApproveExpense = session?.user?.canApproveExpense
  const canApproveMission = session?.user?.canApproveMission
  const canApproveCircle = session?.user?.canApproveCircle
  const canApproveServiceOffer = session?.user?.canApproveServiceOffer
  const canApproveCarneReviver = session?.user?.canApproveCarneReviver
  const canApproveTreasury = session?.user?.canApproveTreasury
  const canApproveAccountant = session?.user?.canApproveAccountant
  const canApproveDirector = session?.user?.canApproveDirector
  const canDeleteLaunch = session?.user?.canDeleteLaunch
  const canImportLaunch = session?.user?.canImportLaunch
  const canGenerateSummary = session?.user?.canGenerateSummary
  const canListSummary = session?.user?.canListSummary
  const defaultLaunchType = session?.user?.defaultLaunchType

      // Adicione esse useMemo para calcular os tipos permitidos
const allowedLaunchTypes = useMemo(() => {
  const types: { value: string; label: string }[] = [];
  if (canLaunchTithe) types.push({ value: 'DIZIMO', label: 'Dízimo' });
  if (canLaunchServiceOffer) types.push({ value: 'OFERTA_CULTO', label: 'Oferta do Culto' });
  if (canLaunchEbd) types.push({ value: 'EBD', label: 'EBD' });
  if (canLaunchMission) types.push({ value: 'MISSAO', label: 'Missão' });
  if (canLaunchCampaign) types.push({ value: 'CAMPANHA', label: 'Campanha' });
  if (canLaunchVote) types.push({ value: 'VOTO', label: 'Voto' });
  if (canLaunchCircle) types.push({ value: 'CIRCULO', label: 'Círculo de Oração' });
  if (canLaunchCarneReviver) types.push({ value: 'CARNE_REVIVER', label: 'Carnê Reviver' });
  if (canLaunchExpense) types.push({ value: 'SAIDA', label: 'Saída' });
  return types;
}, [canLaunchTithe, canLaunchServiceOffer, canLaunchCarneReviver, canLaunchVote, canLaunchEbd, canLaunchCampaign, canLaunchMission, canLaunchCircle, canLaunchExpense]);

// Adicione um useEffect para auto-selecionar
useEffect(() => {
  if (allowedLaunchTypes.length === 1) {
    setFormData(prev => ({ ...prev, type: allowedLaunchTypes[0].value }));
  }
}, [allowedLaunchTypes]);

  const [editingLaunch, setEditingLaunch] = useState<Launch | null>(null)
  const [formData, setFormData] = useState({
    congregationId: '',
    type: allowedLaunchTypes.length === 1 
    ? allowedLaunchTypes[0].value 
    : 'DIZIMO',
    date: format(new Date(), 'yyyy-MM-dd'),
    talonNumber: '',
    value: '',
    description: '',
    contributorId: '',
    contributorName: '',
    isContributorRegistered: false,
    isAnonymous: false,
    supplierId: '',
    supplierName: '',
    isSupplierRegistered: false,
    classificationId: '',
    summaryId: '',
  })

  function truncateString(str: string, num: number) {
    return str.length > num ? str.slice(0, num) + '...' : str;
  }

  useEffect(() => {
    fetchLaunches()
    fetchCongregations()
    fetchContributors()
    fetchSuppliers()
    fetchClassifications()
  }, [currentPage, itemsPerPage, searchTerm, selectedCongregation, startDate, endDate,importFilter])

  useEffect(() => {
    // Se houver apenas uma congregação, definir como default
    if (congregations.length === 1) {
      setFormData(prev => ({
        ...prev,
        congregationId: congregations[0].id
      }))
    }
  }, [congregations])

  // Detectar scroll para mostrar/esconder botão de voltar ao topo
  useEffect(() => {
    const handleScroll = () => {
      setPageYPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleImportCSV = async () => {
    if (!csvFile) {
      alert('Por favor, selecione um arquivo CSV')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/launches/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        let message = `Importação concluída! `
        if (result.updated && result.updated > 0) {
          message += `${result.updated} lançamento(s) atualizado(s)`
        }
        if (result.created && result.created > 0) {
          if (result.updated && result.updated > 0) {
            message += ` e `
          }
          message += `${result.created} lançamento(s) criado(s)`
        }
        if (!result.updated && !result.created) {
          message += `${result.imported} lançamento(s) processado(s)`
        }
        message += `.`
        alert(message)
        fetchLaunches()
        setIsImportDialogOpen(false)
        setCsvFile(null)
      } else {
        const error = await response.json()
        let errorMessage = error.error || 'Erro ao importar arquivo CSV'
        if (error.imported > 0) {
          errorMessage += `\n${error.imported} lançamento(s) processado(s)`
          if (error.updated) errorMessage += ` (${error.updated} atualizado(s))`
          if (error.created) errorMessage += ` (${error.created} criado(s))`
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Erro ao importar CSV:', error)
      alert('Erro ao importar arquivo CSV')
    } finally {
      setImporting(false)
    }
  }

  const resetImportForm = () => {
    setCsvFile(null)
    setImporting(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    } else {
      alert('Por favor, selecione um arquivo CSV válido')
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    try {
      const response = await fetch(`/api/launches/${id}`, { method: 'DELETE' })
      if (response.ok) fetchLaunches()
      else setError('Erro ao excluir lançamento.')
    } catch (error) {
      console.error('Erro ao excluir:', error)
      setError('Erro ao excluir lançamento.')
    }
  }

  const fetchLaunches = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      params.append('type', allowedLaunchTypes.map(t => t.value).join(','))
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

      if (importFilter !== 'ALL') {
        params.append('importFilter', importFilter)
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

    if (name === 'contributorName' || name === 'description' || name === 'supplierName') {
      const upperValue = value.toUpperCase()
      setFormData((prev) => ({ ...prev, [name]: upperValue }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleField = (name: string) => {
    setFormData((prev) => {
      const newValue = !prev[name];

      // Regra de negócio: Se marcar Anônimo, desmarca o Contribuinte e vice-versa
      if (name === 'isAnonymous') {
        return {
          ...prev,
          isAnonymous: newValue,
          isContributorRegistered: newValue ? false : prev.isContributorRegistered,
          contributorName: newValue ? 'ANÔNIMO' : '',
          contributorId: newValue ? null : prev.contributorId,
        };
      }
      if (name === 'isContributorRegistered') {
        return {
          ...prev,
          isContributorRegistered: newValue,
          isAnonymous: false,
          contributorName: newValue ? '' : prev.contributorName,
          contributorId: newValue ? prev.contributorId : null,
        };
      }
      if (name === 'isSupplierRegistered' && newValue) {
        return { ...prev, isSupplierRegistered: true };
      }

      return { ...prev, [name]: newValue };
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSalvando(true)

    // Validações
    if (!formData.congregationId) {
      alert("Congregação é obrigatória")
      setSalvando(false)
      return
    }

    if (formData.type === "SAIDA" && !formData.classificationId) {
      alert("Classificação é obrigatória para lançamentos do tipo Saída")
      setSalvando(false)
      return
    }

    // Comparar apenas a data (ignorando a hora) usando a data já parseada
    const todayStart = startOfDay(new Date())
    if (startOfDay(new Date(formData.date)) > todayStart) {
      setSalvando(false)
      return alert("Não é permitido lançar com data futura")
    }

    if (startOfDay(new Date(formData.date)).getTime() <= (todayStart.getTime() - (session?.user?.historyDays || 0) * 24 * 60 * 60 * 1000)) {
      setSalvando(false)
      return alert("Não é permitido lançar com data anterior ao limite permitido")
    }

    // Todos os tipos agora usam campo único "value" (exceto quando a regra específica difere)
    const numericValue = parseFloat(formData.value as any)
    if (['VOTO', 'EBD', 'CAMPANHA', 'DIZIMO', 'SAIDA', 'OFERTA_CULTO', 'MISSAO', 'CIRCULO', 'CARNE_REVIVER'].includes(formData.type)) {
      if (!numericValue || Number.isNaN(numericValue)) {
        alert('O campo Valor deve ser preenchido.')
        setSalvando(false)
        return
      }
    }

    if (formData.type === 'DIZIMO' && !formData.contributorName && !formData.contributorId) {
      alert('Nome do contribuinte é obrigatório para lançamentos do tipo Dízimo')
      setSalvando(false)
      return
    }

    //var opcoesFormatacao = { timeZone: USER_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    //formData.date = formData.date.toLocaleString('pt-BR', opcoesFormatacao).split('/').reverse().join('-');

    try {
      const url = editingLaunch ? `/api/launches/${editingLaunch.id}` : '/api/launches'
      const method = editingLaunch ? 'PUT' : 'POST'

      // enviar value como número
      const bodyToSend = {
        ...formData,
        contributorName: formData.isAnonymous ? 'ANÔNIMO' : formData.contributorName,
        // Limpar contributorId se não for contribuinte cadastrado
        contributorId: formData.isContributorRegistered ? formData.contributorId : '',
        // Limpar supplierId se não for fornecedor cadastrado
        supplierId: formData.isSupplierRegistered ? formData.supplierId : '',
        value: Number(parseFloat(formData.value as any) || 0)
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend)
      })

      if (response.ok) {
        // Scroll para o topo da página no mobile
        window.scrollTo({ top: 0, behavior: 'smooth' })

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
    setFormData({
      congregationId: launch.congregationId,
      type: launch.type,
      date: format(new Date(launch.date), 'yyyy-MM-dd'),
      talonNumber: launch.talonNumber || '',
      value: launch.value?.toFixed(2) || '',
      description: launch.description || '',
      contributorId: launch.contributorId?.toString() || '',
      contributorName: launch.contributor?.name || launch.contributorName || '',
      isContributorRegistered: !!launch.contributorId,
      isAnonymous: launch.contributorName === 'ANÔNIMO' && !launch.contributorId,
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
    if (confirm('Tem certeza que deseja cancelar este lançamento?')) {
    try {
      const launch = launches.find(l => l.id === id)

      if (launch?.status !== 'NORMAL') {
        setError(`Apenas lançamentos com status Normal podem ser cancelados. Status atual: ${launch?.status}`)
        return
      }

      const response = await fetch(`api/launches/status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'CANCELED',
          cancelledBy: session?.user?.name,
          cancelledAt: new Date().toISOString()
        }),
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
        body: JSON.stringify({
          id,
          status: 'APPROVED',
          approvedBy: session?.user?.name,
          approvedByTreasury: canApproveTreasury,
          approvedByAccountant: canApproveAccountant,
          approvedByDirector: canApproveDirector,
          approvedAt: new Date().toISOString()
        }),
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
      type: allowedLaunchTypes.length === 1 ? allowedLaunchTypes[0].value : (allowedLaunchTypes.find(t => t.value === session?.user?.defaultLaunchType)?.value || 'DIZIMO'),
      date: format(new Date(), 'yyyy-MM-dd'),
      talonNumber: '',
      value: '',
      description: '',
      contributorId: '',
      contributorName: '',
      isContributorRegistered: false,
      isAnonymous: false,
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
  // Mobile
  const LaunchCard = ({ launch }) => (
    <Card key={launch.id} className="mb-2 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 pt-0.5 pb-1">
        <div className="flex justify-between items-start mb-1">
          <div className={`px-3 py-1 rounded text-white text-sm font-medium ${launch.type === 'VOTO' ? 'bg-green-500' :
              launch.type === 'EBD' ? 'bg-green-500' :
                launch.type === 'CAMPANHA' ? 'bg-green-500' :
                  launch.type === 'DIZIMO' ? 'bg-blue-500' :
                    launch.type === 'CARNE_REVIVER' ? 'bg-green-500' :
                      launch.type === 'SAIDA' ? 'bg-red-500' :
                        launch.type === 'MISSAO' ? 'bg-green-500' :
                          launch.type === 'OFERTA_CULTO' ? 'bg-green-500' :
                            launch.type === 'CIRCULO' ? 'bg-green-500' : ''
            }`}>
            {launch.type === 'VOTO' ? 'Voto' :
              launch.type === 'EBD' ? 'EBD' :
                launch.type === 'CAMPANHA' ? 'Campanha' :
                  launch.type === 'DIZIMO' ? 'Dízimo' :
                    launch.type === 'CARNE_REVIVER' ? 'Carnê Reviver' :
                      launch.type === 'SAIDA' ? 'Saída' :
                        launch.type === 'MISSAO' ? 'Missão' :
                          launch.type === 'OFERTA_CULTO' ? 'Oferta do Culto' :
                            launch.type === 'CIRCULO' ? 'Círculo de Oração' : ''}
          </div>
          <div className={`flex items-center space-x-2`}>
            <Badge className={`${launch.status === 'IMPORTED' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
            variant={
              launch.status === 'NORMAL' ? 'default' :
                launch.status === 'APPROVED' ? 'default' :
                  launch.status === 'EXPORTED' ? 'secondary' : 
                    launch.status === 'IMPORTED' ? 'destructive' : 'destructive'
            }>
              {launch.status === 'NORMAL' ? 'Normal' :
                launch.status === 'APPROVED' ? 'Aprovado' :
                  launch.status === 'EXPORTED' ? 'Exportado' : 
                  launch.status === 'IMPORTED' ? 'Importado' : 'Cancelado'}
            </Badge>
            {launch.approvedBy && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-gray-500 cursor-help">ℹ️</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aprovado por: {launch.approvedBy}</p>
                  <p>{launch.approvedAt ? format(new Date(launch.approvedAt), 'dd/MM/yyyy HH:mm') : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
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
              <User className="h-4 w-4 mr-1 shrink-0 text-gray-500" />
              <span className="truncate">
                {launch.contributor?.name || launch.contributorName || launch.supplier?.razaoSocial || launch.supplierName}
              </span>
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
          <div className="flex justify-start">
            <List className="h-4 w-4 mr-1" />
            {/* <span className="text-sm font-normal">Classificação:</span> */}
            <span className="text-sm font-medium">{launch.classification.description}</span>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-0">

          {launch.status === 'CANCELED' && launch.summaryId == null && canDeleteLaunch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(launch.id)}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Excluir</p></TooltipContent>
            </Tooltip>
          )}

          {launch.status == 'NORMAL' && launch.summaryId == null && (canLaunchVote || canLaunchEbd || canLaunchCampaign || canLaunchExpense || canLaunchTithe || canLaunchMission || canLaunchCircle || canLaunchServiceOffer || canApproveCarneReviver) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleCancel(launch.id)}><Trash2 className="h-4 w-4 mr-1" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Cancelar</p></TooltipContent>
            </Tooltip>
          ) : null}

          {launch.status === 'NORMAL' && launch.summaryId == null && (
            <>
              {(launch.type === 'VOTO' && canApproveVote) ||
                (launch.type === 'EBD' && canApproveEbd) ||
                (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                (launch.type === 'DIZIMO' && canApproveTithe) ||
                (launch.type === 'CARNE_REVIVER' && canApproveCarneReviver) ||
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

          {launch.status === 'APPROVED' && launch.summaryId == null && (
            <>
              {(launch.type === 'VOTO' && canApproveVote) ||
                (launch.type === 'EBD' && canApproveEbd) ||
                (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                (launch.type === 'DIZIMO' && canApproveTithe) ||
                (launch.type === 'CARNE_REVIVER' && canApproveCarneReviver) ||
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => handleEdit(launch)}>
                <Edit className="h-4 w-4 mr-1" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Editar</p></TooltipContent>
          </Tooltip>

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
        canLaunchCarneReviver: canLaunchCarneReviver,
        canApproveVote: canApproveVote,
        canApproveEbd: canApproveEbd,
        canApproveCampaign: canApproveCampaign,
        canApproveTithe: canApproveTithe,
        canApproveExpense: canApproveExpense,
        canApproveMission: canApproveMission,
        canApproveCircle: canApproveCircle,
        canApproveServiceOffer: canApproveServiceOffer,
        canApproveCarneReviver: canApproveCarneReviver,
      }}
    >

      <div id="container" className="min-h-screen bg-gray-50" style={{ fontSize: '16px' }}>
        <Sidebar />
        <div className="lg:pl-64">
          <div className="p-2">
            <div className="flex justify-end mb-2">
              <div className="flex space-x-2">
                {(canGenerateSummary || canListSummary) && 
                <Button
                  //variant="defaulSt"
                  onClick={() => router.push('/congregation-summary')}
                  className="md:flex items-center gap-2 bg-amber-600 text-white"
                >
                  <PieChart className="h-4 w-4" />
                  Resumo
                </Button>}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} disabled={!canLaunchVote && !canLaunchEbd && !canLaunchCampaign && !canLaunchTithe && !canLaunchExpense && !canLaunchMission && !canLaunchCircle && !canLaunchServiceOffer && !canLaunchCarneReviver}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 sm:p-6 fixed" style={{ fontSize: '16px' }}>
                    <DialogHeader>
                      <DialogTitle>{editingLaunch ? 'Editar' : 'Novo'}</DialogTitle>
                      <DialogDescription asChild style={{ fontSize: '14px' }}>
                        {editingLaunch && editingLaunch.status !== 'NORMAL' && editingLaunch.status !== 'IMPORTED' && (
                          <div className="mt-2 p-2 bg-yellow-50 text-red-800 rounded-md flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Este lançamento não pode ser editado porque está com status "{editingLaunch.status === 'CANCELED' ? 'CANCELADO' : editingLaunch.status === 'APPROVED' ? 'APROVADO' : editingLaunch.status === 'EXPORTED' ? 'EXPORTADO' : editingLaunch.status === 'IMPORTED' ? 'IMPORTADO' : ''}".
                          </div>
                        )}
                      </DialogDescription>
                      <DialogDescription asChild style={{ fontSize: '14px' }}>
                        {editingLaunch && editingLaunch.status === 'IMPORTED' && (
                          <div className="mt-2 p-2 bg-yellow-50 text-red-800 rounded-md flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Este lançamento faz parte da integração bancária e não pode ser alterado.
                          </div>
                        )}
                      </DialogDescription>
                      <DialogDescription asChild style={{ fontSize: '14px' }}>
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

                    <Tabs defaultValue="dados" className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2 px-4 sm:px-0">
                        <TabsTrigger value="dados">Dados</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                      </TabsList>
                      <TabsContent value="dados" className="max-w-[calc(105vw-3rem)] p-2 sm:p-0 overflow-x-hidden">
                        <form onSubmit={handleSubmit} className="space-y-2 px-2 sm:px-0 w-full max-w-full overflow-x-hidden">
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor="congregationId">Congregação</Label>
                              <SearchableSelect
                                label="Buscar Congregação"
                                placeholder="Selecione a Congregação"
                                value={formData.congregationId}
                                disabled={editingLaunch ? (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null) : congregations.length === 1}
                                onChange={(value) => handleSelectChange('congregationId', value)}
                                name="congregationId"
                                data={congregations.map(s => ({ id: s.id, name: s.name }))}
                                itemRenderMode="congregation"
                                searchKeys={['name']}
                                required
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="w-full">
                                <Label htmlFor="type">Tipo</Label>
                                <Select
                                  value={formData.type}
                                  onValueChange={(value) => handleSelectChange('type', value)}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null) || allowedLaunchTypes.length === 1}
                                  data={allowedLaunchTypes.map(t => t.value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {canLaunchTithe && <SelectItem value="DIZIMO">Dízimo</SelectItem>}
                                    {canLaunchServiceOffer && <SelectItem value="OFERTA_CULTO">Oferta do Culto</SelectItem>}
                                    {canLaunchEbd && <SelectItem value="EBD">EBD</SelectItem>}
                                    {canLaunchMission && <SelectItem value="MISSAO">Missão</SelectItem>}
                                    {canLaunchCampaign && <SelectItem value="CAMPANHA">Campanha</SelectItem>}
                                    {canLaunchVote && <SelectItem value="VOTO">Voto</SelectItem>}
                                    {canLaunchCircle && <SelectItem value="CIRCULO">Círculo de Oração</SelectItem>}
                                    {canLaunchCarneReviver && <SelectItem value="CARNE_REVIVER">Carnê Reviver</SelectItem>}
                                    {canLaunchExpense && <SelectItem value="SAIDA">Saída</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>

                              {formData.type === 'SAIDA' && (
                                <div className="w-full">
                                  <Label htmlFor="classificationId">Classificação</Label>
                                  <SearchableSelect
                                    label="Buscar Classificação"
                                    placeholder="Selecione uma classificação"
                                    value={formData.classificationId}
                                    disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}
                                    onChange={(value) => handleSelectChange('classificationId', value)}
                                    name="classificationId"
                                    data={classifications.map(c => ({ id: c.id, name: c.description }))}
                                    itemRenderMode="classification"
                                    searchKeys={['name']}
                                  />
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
                                  inputMode="none"
                                  value={formData.date ?? ''}
                                  onChange={handleInputChange}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                  style={{ fontSize: '16px' }}
                                  locale="pt-BR"
                                />
                              </div>

                              <div>
                                {formData.type === 'SAIDA' ? <Label htmlFor="talonNumber">Nr. Doc</Label> : formData.type === 'DIZIMO' ? <Label htmlFor="talonNumber">Nr. Recibo</Label> : formData.type === 'CARNE_REVIVER' || formData.type === 'MISSAO' ? '' : <Label htmlFor="talonNumber">Nr. Talão</Label>}
                                {(formData.type !== 'CARNE_REVIVER' && formData.type !== 'MISSAO') && (
                                  <Input
                                    id="talonNumber"
                                    name="talonNumber"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formData.talonNumber ?? ''}
                                    onChange={handleInputChange}
                                    disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                    style={{ fontSize: '16px' }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Campo único de valor para todos os tipos */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="value">{formData.type === 'VOTO' ? 'Valor Voto' : formData.type === 'EBD' ? 'Valor EBD' : formData.type === 'CAMPANHA' ? 'Valor Campanha' : formData.type === 'OFERTA_CULTO' ? 'Valor Oferta' : 'Valor'}</Label>
                                <NumericFormat
                                  id="value"
                                  name="value"
                                  inputMode="decimal"
                                  className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                                  value={formData.value ?? ''}
                                  onValueChange={(values) => {
                                    const { floatValue, value } = values;
                                    // armazenar como string normalizada
                                    setFormData(prev => ({ ...prev, value: (floatValue !== undefined ? floatValue : value) as any }))
                                  }}
                                  thousandSeparator="."
                                  decimalSeparator=","
                                  allowNegative={false}
                                  //prefix="R$ "
                                  //decimalScale={2}
                                  //fixedDecimalScale={true}
                                  disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                  style={{ fontSize: '16px' }}
                                  onFocus={(e) => {
                                    // Scroll para o input quando focado no mobile
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    }, 300)
                                  }}
                                />
                              </div>
                            </div>

                            {/* Dízimo: contribuinte */}
                            {(formData.type === 'DIZIMO' || formData.type === 'CARNE_REVIVER') && (
                              <div className="w-full">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                                    <Button
                                      type="button"
                                      variant={formData.isContributorRegistered ? "default" : "outline"}
                                      size="sm"
                                      disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null) || !formData.congregationId}
                                      className={cn(
                                        "h-9 px-3 transition-all flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start",
                                        formData.isContributorRegistered
                                          ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-800 shadow-sm"
                                          : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                      )}
                                      onClick={() => toggleField('isContributorRegistered')}
                                    >
                                      {formData.isContributorRegistered ? (
                                        <Check className="h-4 w-4 animate-in zoom-in duration-200 shrink-0" />
                                      ) : (
                                        <Users className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="text-sm sm:text-base">Contribuinte Cadastrado</span>
                                    </Button>
                                  </div>

                                  {!formData.isContributorRegistered && (
                                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                                      <Button
                                        type="button"
                                        variant={formData.isAnonymous ? "default" : "outline"}
                                        size="sm"
                                        disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null)}
                                        className={cn(
                                          "h-9 px-3 transition-all flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start",
                                          formData.isAnonymous
                                            ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-800 shadow-sm"
                                            : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                        )}
                                        onClick={() => toggleField('isAnonymous')}
                                      >
                                        {formData.isAnonymous ? (
                                          <Check className="h-4 w-4 animate-in zoom-in duration-200 shrink-0" />
                                        ) : (
                                          <Ghost className="h-4 w-4 shrink-0" />
                                        )}
                                        <span className="text-sm sm:text-base">Anônimo</span>
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {formData.isContributorRegistered ? (
                                  <div className="mt-2 w-full">
                                    <Label htmlFor="contributorId">Contribuinte</Label>
                                    <SearchableSelect
                                      key={formData.contributorId}
                                      label="Buscar Contribuinte"
                                      placeholder="Selecione o contribuinte"
                                      value={formData.contributorId ?? ''}
                                      disabled={editingLaunch && (editingLaunch.status !== 'NORMAL'|| editingLaunch.summaryId != null)}
                                      onChange={(value) => handleSelectChange('contributorId', value)}
                                      name="contributorId"
                                      data={contributors.filter(f => (f.congregationId == formData.congregationId)).map(c => ({ key: c.id, id: c.id, name: c.name, document: c.cpf, cargo: c.ecclesiasticalPosition, photoUrl: c.photoUrl, photoExists: c.photoExists }))}
                                      searchKeys={['name', 'document']}
                                    />
                                  </div>
                                ) : (
                                  <div className="mt-2 w-full">
                                    <Label htmlFor="contributorName">Nome do Contribuinte</Label>
                                    <Input
                                      id="contributorName"
                                      name="contributorName"
                                      value={formData.contributorName ?? ''}
                                      onChange={handleInputChange}
                                      disabled={formData.isAnonymous || (editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null))}
                                      className="w-full"
                                      //required={!formData.isAnonymous}
                                      style={{ fontSize: '16px' }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Carne Reviver: contribuinte
                         {formData.type === 'CARNE_REVIVER' && (
                           <div className="w-full">
                             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                               <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant={formData.isContributorRegistered ? "default" : "outline"}
                                    size="sm"
                                    disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                    className={cn(
                                      "h-9 px-3 transition-all flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start",
                                      formData.isContributorRegistered 
                                          ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-800 shadow-sm" 
                                          : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                    )}
                                    onClick={() => toggleField('isContributorRegistered')}
                                  >
                                    {formData.isContributorRegistered ? (
                                      <Check className="h-4 w-4 animate-in zoom-in duration-200 shrink-0" />
                                    ) : (
                                      <Users className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="text-sm sm:text-base">Contribuinte cadastrado</span>
                                  </Button>
                               </div>

                               {!formData.isContributorRegistered && (
                                 <div className="flex items-center space-x-2 w-full sm:w-auto">
                                  <Button
                                      type="button"
                                      variant={formData.isAnonymous ? "default" : "outline"}
                                      size="sm"
                                      disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                      className={cn(
                                        "h-9 px-3 transition-all flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start",
                                        formData.isAnonymous 
                                          ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-800 shadow-sm" 
                                          : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                      )}
                                      onClick={() => toggleField('isAnonymous')}
                                    >
                                      {formData.isAnonymous ? (
                                        <Check className="h-4 w-4 animate-in zoom-in duration-200 shrink-0" />
                                      ) : (
                                        <Ghost className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="text-sm sm:text-base">Anônimo</span>
                                    </Button>
                                 </div>
                               )}
                             </div>

                             {formData.isContributorRegistered ? (
                               <div className="mt-2 w-full">
                                 <Label htmlFor="contributorId">Contribuinte</Label>
                                 <SearchableSelect
                                   key={formData.contributorId}
                                   label="Buscar Contribuinte"
                                   placeholder="Selecione o contribuinte"
                                   value={formData.contributorId ?? ''}
                                   disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                   onChange={(value) => handleSelectChange('contributorId', value)}
                                   name="contributorId"
                                   data={contributors.filter(f => (f.congregationId == formData.congregationId)).map(c => ({ key: c.id, id: c.id, name: c.name, document: c.cpf, cargo: c.ecclesiasticalPosition, photoUrl: c.photoUrl, photoExists: c.photoExists }))}
                                   searchKeys={['name', 'document']}
                                 />
                               </div>
                             ) : (
                               <div className="mt-2 w-full">
                                 <Label htmlFor="contributorName">Nome do Contribuinte</Label>
                                 <Input
                                   id="contributorName"
                                   name="contributorName"
                                   value={formData.contributorName ?? ''}
                                   onChange={handleInputChange}
                                   disabled={formData.isAnonymous || (editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.summaryId != null))}
                                   className="w-full"
                                   //required={!formData.isAnonymous}
                                   style={{ fontSize: '16px' }}
                                 />
                               </div>
                             )}
                           </div>
                         )} */}

                            {/* Fornecedor para SAIDA */}
                            {['SAIDA'].includes(formData.type) && (
                              <>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    variant={formData.isSupplierRegistered ? "default" : "outline"}
                                    size="sm"
                                    disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                    className={cn(
                                      "h-9 px-3 transition-all flex items-center gap-2",
                                      formData.isSupplierRegistered
                                        ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-800 shadow-sm"
                                        : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                    )}
                                    onClick={() => toggleField('isSupplierRegistered')}
                                  >
                                    {formData.isSupplierRegistered ? (
                                      <Check className="h-4 w-4 animate-in zoom-in duration-200" />
                                    ) : (
                                      <User className="h-4 w-4" />
                                    )}
                                    Fornecedor Cadastrado
                                  </Button>
                                </div>
                                {formData.isSupplierRegistered ? (
                                  <div>
                                    <Label htmlFor="supplierId">Fornecedor</Label>
                                    <SearchableSelect
                                      key={formData.supplierId}
                                      label="Buscar Fornecedor"
                                      placeholder="Selecione o fornecedor"
                                      value={formData.supplierId ?? ''}
                                      disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                      onChange={(value) => handleSelectChange('supplierId', value)}
                                      name="supplierId"
                                      data={suppliers.map(s => ({ key: s.id, id: s.id, name: truncateString(s.razaoSocial, 45), document: s.cpfcnpj }))}
                                      searchKeys={['name', 'document']}
                                      itemRenderMode="supplier"
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
                                      disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null)}
                                      style={{ fontSize: '16px' }}
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
                                style={{ fontSize: '16px' }}
                              />
                            </div>

                            <DialogFooter>
                              <Button type="submit" disabled={editingLaunch && (editingLaunch.status !== 'NORMAL' || editingLaunch.status === 'IMPORTED' || editingLaunch.summaryId != null) || salvando}>
                                {editingLaunch ? 'Atualizar' : 'Salvar'}
                              </Button>
                            </DialogFooter>
                          </div>
                        </form>
                      </TabsContent>
                      <TabsContent value="logs" className="max-w-[350px] md:max-w-[600px] max-h-[50vh] h-[50vh] min-h-0">
                        <div className="space-y-4 py-4 p-2">
                          <div className="rounded-md border">
                            <div>
                              <Table className="min-w-max">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Ação</TableHead>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Data/Hora</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {/* Log de Inclusão */}
                                  <TableRow>
                                    <TableCell className="font-medium">Inclusão</TableCell>
                                    <TableCell>{editingLaunch?.createdBy || 'N/A'}</TableCell>
                                    <TableCell>{editingLaunch?.createdAt ? format(new Date(editingLaunch.createdAt), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                  </TableRow>
                                  {/* Log de Cancelamento */}
                                  {editingLaunch?.status === 'CANCELED' && (
                                    <TableRow className="text-red-600">
                                      <TableCell className="font-medium">Cancelamento</TableCell>
                                      <TableCell>{editingLaunch?.cancelledBy || '-'}</TableCell>
                                      <TableCell>{editingLaunch?.cancelledAt ? format(new Date(editingLaunch.cancelledAt), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                    </TableRow>
                                  )}
                                  {/* Logs de Aprovação Específicos */}
                                  <TableRow>
                                    <TableCell className="font-medium">Tesoureiro</TableCell>
                                    <TableCell>{editingLaunch?.approvedByTreasury || '-'}</TableCell>
                                    <TableCell>{editingLaunch?.approvedAtTreasury ? format(new Date(editingLaunch.approvedAtTreasury), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">Contador</TableCell>
                                    <TableCell>{editingLaunch?.approvedByAccountant || '-'}</TableCell>
                                    <TableCell>{editingLaunch?.approvedAtAccountant ? format(new Date(editingLaunch.approvedAtAccountant), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">Dirigente</TableCell>
                                    <TableCell>{editingLaunch?.approvedByDirector || '-'}</TableCell>
                                    <TableCell>{editingLaunch?.approvedAtDirector ? format(new Date(editingLaunch.approvedAtDirector), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">Método de Aprovação</TableCell>
                                    <TableCell colSpan={2}>
                                      {editingLaunch?.approvedVia === 'GRID' ? 'Via Grid de Lançamentos' :
                                        editingLaunch?.approvedVia === 'SUMMARY' ? 'Via Resumo' : '-'}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                {canImportLaunch && (
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="hidden lg:flex" variant="outline" onClick={resetImportForm}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar CSV
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Importar Lançamentos via CSV</DialogTitle>
                        <DialogDescription>
                          Faça upload de um arquivo CSV com os Lançamentos. <br />
                          O arquivo deve ter as colunas: <br />
                          <span className="text-xs font-mono">Congregação,Tipo,Data,Numero,Valor,Contribuinte,Descrição</span>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="csvFile" className="text-right">
                            Arquivo CSV
                          </Label>
                          <Input
                            id="csvFile"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="col-span-3"
                            required
                          />
                        </div>

                        {/* <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          <p className="font-medium mb-2">Formato esperado do CSV:</p>
                          <p className="text-xs font-mono">Codigo,Nome,CPF,CargoEclesiastico,CodCongregação,Tipo,Foto</p>
                          <p className="text-xs font-mono">1,João Silva,12345678901,Pastor,1,Congregado,foto.jpg</p>
                          <p className="text-xs font-mono">2,Maria Santos,98765432100,Diácono,2,Membro,foto.jpg</p>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <a
                              href="/exemplo-contribuintes.csv"
                              download
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              📥 Baixar arquivo de exemplo
                            </a>
                          </div>
                        </div> */}
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={handleImportCSV}
                          disabled={!csvFile || importing}
                        >
                          {importing ? 'Importando...' : 'Importar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
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
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                {/* <Label>Origem do Lançamento</Label> */}
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
                              <div className={`w-full py-1 px-0 rounded text-center text-white font-medium ${launch.type === 'DIZIMO' ? 'bg-blue-500' :
                                  launch.type === 'OFERTA_CULTO' ? 'bg-green-500' :
                                    launch.type === 'VOTO' ? 'bg-green-500' :
                                      launch.type === 'EBD' ? 'bg-green-500' :
                                        launch.type === 'CAMPANHA' ? 'bg-green-500' :
                                          launch.type === 'CARNE_REVIVER' ? 'bg-green-500' :
                                            launch.type === 'SAIDA' ? 'bg-red-500' :
                                              launch.type === 'MISSAO' ? 'bg-green-500' :
                                                launch.type === 'OFERTA_CULTO' ? 'bg-green-500' :
                                                  launch.type === 'CIRCULO' ? 'bg-green-500' : ''
                                }`}>
                                {launch.type === 'VOTO' ? 'Voto' :
                                  launch.type === 'OFERTA_CULTO' ? 'Oferta do Culto' :
                                    launch.type === 'EBD' ? 'EBD' :
                                      launch.type === 'CAMPANHA' ? 'Campanha' :
                                        launch.type === 'DIZIMO' ? 'Dízimo' :
                                          launch.type === 'CARNE_REVIVER' ? 'Carnê Reviver' :
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
                              <div className="flex items-center space-x-2">
                                <Badge className={`w-32 text-center py-1.5 px-1 rounded 
                                ${launch.status === 'EXPORTED' ? 'text-black' : 'text-white'} 
                                ${launch.status === 'IMPORTED' ? 'bg-orange-500 hover:bg-orange-600' : ''} font-medium`} 
                                
                                variant={
                                  launch.status === 'NORMAL' ? 'default' :
                                    launch.status === 'APPROVED' ? 'default' :
                                      launch.status === 'EXPORTED' ? 'secondary' : 
                                        launch.status === 'IMPORTED' ? 'secondary' : 'destructive'
                                }>
                                  {launch.status === 'NORMAL' ? 'Normal' :
                                    launch.status === 'APPROVED' ? 'Aprovado' :
                                      launch.status === 'EXPORTED' ? 'Exportado' : 
                                        launch.status === 'IMPORTED' ? 'Importado' : 'Cancelado'}
                                </Badge>
                                {/* {launch.approvedBy && (
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <div className="text-xs text-gray-500 cursor-help">ℹ️</div>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Aprovado por: {launch.approvedBy}</p>
                                     <p>{launch.approvedAt ? format(new Date(launch.approvedAt), 'dd/MM/yyyy HH:mm') : ''}</p>
                                   </TooltipContent>
                                 </Tooltip>
                               )} */}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">

                                {(launch.status === 'CANCELED' || launch.status === 'IMPORTED') && launch.summaryId == null && canDeleteLaunch && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="destructive" size="sm" onClick={() => handleDelete(launch.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Excluir</p></TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {launch.status == 'NORMAL' && launch.summaryId == null && (canLaunchVote || canLaunchEbd || canLaunchCampaign || canLaunchExpense || canLaunchTithe || canLaunchMission || canLaunchCircle || canLaunchServiceOffer) ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" onClick={() => handleCancel(launch.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cancelar</p></TooltipContent>
                                  </Tooltip>
                                ) : null}
 
                                {launch.status === 'NORMAL' && launch.summaryId == null && (
                                  <>
                                    {(launch.type === 'VOTO' && canApproveVote) ||
                                      (launch.type === 'EBD' && canApproveEbd) ||
                                      (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                                      (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                                      (launch.type === 'DIZIMO' && canApproveTithe) ||
                                      (launch.type === 'CARNE_REVIVER' && canApproveCarneReviver) ||
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

                                {launch.status === 'APPROVED' && launch.summaryId == null && (
                                  <>
                                    {(launch.type === 'VOTO' && canApproveVote) ||
                                      (launch.type === 'EBD' && canApproveEbd) ||
                                      (launch.type === 'CAMPANHA' && canApproveCampaign) ||
                                      (launch.type === 'OFERTA_CULTO' && canApproveServiceOffer) ||
                                      (launch.type === 'DIZIMO' && canApproveTithe) ||
                                      (launch.type === 'CARNE_REVIVER' && canApproveCarneReviver) ||
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

                                {(launch.type === 'VOTO' && canLaunchVote) ||
                                  (launch.type === 'EBD' && canLaunchEbd) ||
                                  (launch.type === 'CAMPANHA' && canLaunchCampaign) ||
                                  (launch.type === 'OFERTA_CULTO' && canLaunchServiceOffer) ||
                                  (launch.type === 'CARNE_REVIVER' && canLaunchCarneReviver) ||
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
      {/* Botão flutuante de voltar ao topo - apenas mobile */}
      {pageYPosition > 10 && (
        <a
          href="#container"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "15px",
            background: "#333",
            color: "white",
            padding: "10px 15px",
            borderRadius: "5px",
            textDecoration: "none",
          }}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <ArrowUp className="h-6 w-6" />
        </a>)}
    </PermissionGuard>
  )
}
