'use client'

import { useState, useEffect, useMemo, useReducer } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search, Check, X, AlertCircle, MoreVertical, CalendarIcon, DollarSign, User } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { format } from 'date-fns'
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


export default function Launches() {
  const { data: session } = useSession()
  const [launches, setLaunches] = useState<Launch[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const [expandedCard, setExpandedCard] = useState(null)
    // Estados para paginação e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCongregation, setSelectedCongregation] = useState('all')

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [value, setValue] = useReducer((prev, next) => moneyFormatter.format(next), "")
  

  // Tipos
  type Congregation = { id: string; name: string }
  type Contributor = { id: string; name: string; cpf: string; congregationId: string; ecclesiasticalPosition: string }
  type Supplier = { id: string; razaoSocial: string; cpfcnpj: string }
  type Classification = { id: string; description: string }

  type Launch = {
    id: string
    congregationId: string
    type: string
    date: string
    talonNumber?: string
    offerValue?: number
    votesValue?: number
    ebdValue?: number
    campaignValue: number,
    value?: number
    description?: string
    status?: string
    exported?: boolean
    congregation?: { id: string; name: string }
    contributorId?: string
    contributor?: { id: string; name: string; congregationId: string; ecclesiasticalPosition: string  }
    contributorName?: string
    supplierId?: string
    supplier?: { id: string; razaoSocial: string; cpfcnpj: string }
    supplierName?: string
    classificationId?: string
    classification?: { id: string; name: string }
    approved?: boolean
  }

  // Permissões
  const canLaunchEntry = session?.user?.canLaunchEntry
  const canLaunchTithe = session?.user?.canLaunchTithe
  const canLaunchExpense = session?.user?.canLaunchExpense
  const canApproveEntry = session?.user?.canApproveEntry
  const canApproveTithe = session?.user?.canApproveTithe
  const canApproveExpense = session?.user?.canApproveExpense
  const canEdit = session?.user?.canEdit

  const [editingLaunch, setEditingLaunch] = useState<Launch | null>(null)
  const [formData, setFormData] = useState({
    congregationId: '',
    type: 'DIZIMO',
    date: format(new Date(), 'yyyy-MM-dd'),
    talonNumber: '',
    offerValue: '',
    votesValue: '',
    ebdValue: '',
    campaignValue: '',
    value: '',
    description: '',
    contributorId: '',
    contributorName: '',
    isContributorRegistered: true,
    supplierId: '',
    supplierName: '',
    isSupplierRegistered: true,
    classificationId: '',
  })

  useEffect(() => {
    fetchLaunches()
    fetchCongregations()
    fetchContributors()
    fetchSuppliers()
    fetchClassifications()
  }, [currentPage, itemsPerPage, searchTerm, selectedCongregation])

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
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        searchTerm,
        ...(selectedCongregation !== 'all' && { congregationId: selectedCongregation })
      })

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
      const response = await fetch('/api/contributors')
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

    const moneyFormatter = Intl.NumberFormat('pt-BR', {
      currency: 'BRL',
      currencyDisplay: 'symbol',
      currencySign: 'standard',
      style: 'currency',
      minimumFractionDigits: 2,  
      maximumFractionDigits: 4,  
      minimumIntegerDigits: 1,  
      // minimumSignificantDigits: 1,  
      // maximumSignificantDigits: 10,  
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target

        // Validações para campos específicos
    if (name === 'talonNumber') {
      // Permitir apenas números
      const numericValue = value.replace(/\D/g, '')
      setFormData(prev => ({ ...prev, [name]: numericValue }))
      return
    }

    // if (name.includes('value') || name === 'campaignValue' || name === 'offerValue' || name === 'votesValue' || name === 'ebdValue') {
    //   // Permitir apenas números e vírgula/ponto
    //   const numericValue = value.replace(/[^\d.,]/g, '')
    //   setFormData(prev => ({ ...prev, [name]: numericValue }))
    //   return
    if (name.includes('value') || name === 'campaignValue' || name === 'offerValue' || name === 'votesValue' || name === 'ebdValue') {
        // 1. Permite apenas números, vírgulas e pontos
        const numericValue = value.replace(/[^\d.,]/g, '');
        // 2. Substitui a vírgula por ponto para padronização
        const formattedValue = numericValue.replace(/,/g, '.');
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
        return;    
    }
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))

  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
      // Validações específicas
      if (formData.type === 'DIZIMO' && !formData.contributorName && !formData.contributorId) {
        setError('Nome do contribuinte é obrigatório para lançamentos do tipo Dízimo')
        return
      }
      
      if (formData.type === 'SAIDA' && !formData.classificationId) {
        setError('Classificação é obrigatória para lançamentos do tipo Saída')
        return
      }

        // --- Início da validação de valor ---
        const values = {
          offerValue: parseFloat(formData.offerValue),
          votesValue: parseFloat(formData.votesValue),
          ebdValue: parseFloat(formData.ebdValue),
          campaignValue: parseFloat(formData.campaignValue),
          value: parseFloat(formData.value),
        }
    
        if (formData.type === 'ENTRADA') {
          if (!values.offerValue && !values.votesValue && !values.ebdValue && !values.campaignValue) {
            setError('Pelo menos um dos campos de valor (Oferta, Voto, EBD) deve ser preenchido para Entradas.')
            return
          }
        } else if (formData.type === 'DIZIMO' || formData.type === 'SAIDA') {
          if (!values.value) {
            setError(`O campo Valor deve ser preenchido para ${formData.type === 'DIZIMO' ? 'Dízimos' : 'Saídas'}.`)
            return
          }
        }

        try {

          const url = editingLaunch ? `/api/launches/${editingLaunch.id}` : '/api/launches' // A API já trata a atualização pelo corpo da requisição
          const method = editingLaunch ? 'PUT' : 'POST';
          
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          })

          if (response.ok) {
            fetchLaunches()
            setIsDialogOpen(false)
            resetForm()
          } else {
            const error = await response.json()
            alert(error.error || 'Erro ao salvar lançamento')
          }
        } catch (error) {
          console.error('Erro ao salvar lançamento:', error)
          alert('Erro ao salvar lançamento')
        }
      }

  const handleEdit = (launch: Launch) => {
    setEditingLaunch(launch)
    setFormData({
      congregationId: launch.congregationId,
      type: launch.type,
      date: format(new Date(launch.date), 'yyyy-MM-dd'),
      talonNumber: launch.talonNumber || '',
      offerValue: launch.offerValue?.toString() || '',
      votesValue: launch.votesValue?.toString() || '',
      ebdValue: launch.ebdValue?.toString() || '',
      campaignValue: launch.campaignValue?.toString() || '', // Novo campo
      value: launch.value?.toString() || '',
      description: launch.description || '',
      contributorId: launch.contributorId?.toString() || '',
      contributorName: launch.contributorName || '',
      isContributorRegistered: !!launch.contributorId,
      supplierId: launch.supplierId?.toString() || '',
      supplierName: launch.supplierName || '',
      isSupplierRegistered: !!launch.supplierId,
      classificationId: launch.classificationId || '',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'CANCELED' }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'APPROVED' }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'NORMAL' }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
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
      offerValue: '',
      votesValue: '',
      ebdValue: '',
      campaignValue: '',
      value: '',
      description: '',
      contributorId: '',
      contributorName: '',
      isContributorRegistered: true,
      supplierId: '',
      supplierName: '',
      isSupplierRegistered: true,
      classificationId: '',
    })
    setError(null)
  }


// Filtrar lançamentos com base no termo de pesquisa e congregação selecionada
// const filteredLaunches = useMemo(() => {
//   if (!searchTerm) return launches
//   return launches.filter(launch => { 
//     const matchesCongregation = selectedCongregation === 'all' || 
//         launch.congregationId === selectedCongregation

//     // const matchesSearch = searchTerm === '' || 
//     //   Object.values(launch).some(value => 
//     //     value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
//     //   )

//       launch.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       launch.talonNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (launch.supplierName && launch.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (launch.contributorName && launch.contributorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (launch.supplier?.id && launch.supplier.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (launch.contributor?.id && launch.contributor.name.toLowerCase().includes(searchTerm.toLowerCase())) 
//       //  return matchesSearch && matchesCongregation
//     })
    
//   //   const matchesCongregation = selectedCongregation === 'all' || 
//   //     launch.congregationId === selectedCongregation
    
//   // })
// }, [launches, searchTerm, selectedCongregation])

  // Formatar valor com separador de milhar
  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00'
    
    const numValue = parseFloat(value)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numValue)
  }

  // Filtrar contribuintes e fornecedores baseado na congregação selecionada
  const filteredContributors = contributors.filter(c => 
    !formData.congregationId || c.congregationId === formData.congregationId
  )

  // const filteredSuppliers = suppliers.filter(s =>
  //   !formData.congregationId || s.congregationId === formData.congregationId
  // )

    // Componente para cards em dispositivos móveis
  const LaunchCard = ({ launch }) => (
    <Card key={launch.id} className="mb-2">
      <CardContent className="p-4 pt-0.5">
        <div className="flex justify-between items-start mb-1">
          <div className={`px-3 py-1 rounded text-white text-sm font-medium ${
            launch.type === 'ENTRADA' ? 'bg-green-500' : 
            launch.type === 'DIZIMO' ? 'bg-blue-500' : 'bg-red-500'
          }`}>
            {launch.type === 'ENTRADA' ? 'Outras Receitas' : 
             launch.type === 'DIZIMO' ? 'Dízimo' : 'Saída'}
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
            {launch.type === 'ENTRADA' ? (
              <div className="space-y-1 grid grid-cols-2 gap-0">
                {launch.offerValue > 0 ? <div>Oferta: {formatCurrency(launch.offerValue)}</div> : null}
                {launch.votesValue > 0 ? <div>Votos: {formatCurrency(launch.votesValue)}</div> : null}
                {launch.ebdValue > 0 ? <div>EBD: {formatCurrency(launch.ebdValue)}</div> : null}
                {launch.campaignValue > 0 ? <div>Campanha: {formatCurrency(launch.campaignValue)}</div> : null}
              </div>
            ) : (
              <div>{formatCurrency(launch.value)}</div>
            )}
          </div>
          
          {(launch.contributor?.name || launch.contributorName || launch.supplier?.name || launch.supplierName) && (
            <div className="flex items-center text-sm font-normal">
              <User className="h-4 w-4 mr-1" />
              {launch.contributor?.name || launch.contributorName || launch.supplier?.name || launch.supplierName}
            </div>
          )}
        </div>
        
        {/* <Collapsible open={expandedCard === launch.id} onOpenChange={() => setExpandedCard(expandedCard === launch.id ? null : launch.id)}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2"> */}
            {/* <div className="flex justify-between">
              <span className="text-sm text-gray-500">Congregação:</span>
              <span className="text-sm font-medium">{launch.congregation.name}</span>
            </div> */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(launch)}
                    disabled={!canEdit}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar</p>
                </TooltipContent>
              </Tooltip>              

              {launch.status === 'NORMAL' && (
                <>
                  {(launch.type === 'ENTRADA' && canApproveEntry) ||
                   (launch.type === 'DIZIMO' && canApproveTithe) ||
                   (launch.type === 'SAIDA' && canApproveExpense) ? (
                    <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(launch.id)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {/* Aprovar */}
                      </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Aprovar</p>
                      </TooltipContent>
                    </Tooltip>
                    </>
                  ) : null}
                </>
              )}

              {launch.status === 'APPROVED' && (
                <>
                  {(launch.type === 'ENTRADA' && canApproveEntry) ||
                   (launch.type === 'DIZIMO' && canApproveTithe) ||
                   (launch.type === 'SAIDA' && canApproveExpense) ? (
                    <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprove(launch.id)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {/* Desaprovar */}
                      </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Desaprovar</p>
                      </TooltipContent>
                    </Tooltip>
                    </>
                  ) : null}
                </>
              )}
              

              {launch.status =='NORMAL' && (canLaunchEntry || canLaunchExpense || canLaunchTithe)  ? (
              <>           
                <Tooltip>
                    <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(launch.id)}
                    //disabled={launch.status !== 'NORMAL' || !canEdit}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {/* Cancelar */}
                  </Button>
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>Cancelar</p>
                  </TooltipContent>
                </Tooltip>
              </> ) : null}
            </div>
          {/* </CollapsibleContent>
        </Collapsible> */}
      </CardContent>
    </Card>
  )

    // const canAccessLaunches = ['canLaunchEntry', 'canLaunchTithe', 'canLaunchExpense', 'canApproveEntry', 'canApproveTithe', 'canApproveExpense'];

    // const hasLaunchPermission = canAccessLaunches.find(perm => canAccessLaunches);

   return (
    <PermissionGuard 
      requiredPermissions={{
        canLaunchEntry: canLaunchEntry,
        canLaunchTithe: canLaunchTithe,
        canLaunchExpense: canLaunchExpense,
        canApproveEntry: canApproveEntry,
        canApproveTithe: canApproveTithe,
        canApproveExpense: canApproveExpense,
      }}
    >

    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-2">
          <div className="flex justify-end mb-2">
            {/* <div>
              <h1 className="text-1xl font-bold text-gray-900">Lançamentos Financeiros</h1>
               <p className="text-gray-600">Gerencie os lançamentos de entradas, dízimos e saídas</p> 
            </div> */}
            <div className="flex space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={!canLaunchEntry && !canLaunchTithe && !canLaunchExpense}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLaunch ? 'Editar' : 'Novo'}
                  </DialogTitle>
                  <DialogDescription>
                    {/* Preencha os dados do lançamento financeiro */}
                    {editingLaunch && editingLaunch.status !== 'NORMAL' && (
                      <div className="mt-2 p-2 bg-yellow-50 text-red-800 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Este lançamento não pode ser editado porque está com status "{editingLaunch.status === 'CANCELED' ? 'CANCELADO' : editingLaunch.status === 'APPROVED' ? 'APROVADO': editingLaunch.status === 'EXPORTED' ? 'EXPORTADO' : ''  }"
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
                      <Select
                        value={formData.congregationId}
                        onValueChange={(value) => handleSelectChange('congregationId', value)}
                        disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
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
                    
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => handleSelectChange('type', value)}
                          disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {canLaunchTithe && <SelectItem value="DIZIMO">Dízimos</SelectItem>}
                            {canLaunchEntry && <SelectItem value="ENTRADA">Outras Receitas</SelectItem>}
                            {canLaunchExpense && <SelectItem value="SAIDA">Saídas</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Campo de Classificação (apenas para Saída) */}
                      {formData.type === 'SAIDA' && (
                        <div>
                          <Label htmlFor="classificationId">Classificação</Label>
                          <Select
                            value={formData.classificationId}
                            onValueChange={(value) => handleSelectChange('classificationId', value)}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Data</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
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
                          value={formData.talonNumber}
                          onChange={handleInputChange}
                          disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                        
                        />
                      </div>
                    </div>
                  
                  {/* Campos específicos para Entrada */}
                  {formData.type === 'ENTRADA' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="offerValue">Valor Oferta</Label>
                          {/* <Input
                            id="offerValue"
                            name="offerValue"
                            type="text"
                            inputMode="decimal"
                            value={formData.offerValue}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                           
                          /> */}
                          <NumericFormat
                            id="offerValue"
                            name="offerValue"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.offerValue || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                offerValue: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}     
                          />
                        </div>
                    
                        <div>
                          <Label htmlFor="votesValue">Valor Voto</Label>
                          {/* <Input
                            id="votesValue"
                            name="votesValue"
                            type="text"
                            inputMode="decimal"
                            value={formData.votesValue}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                              
                          /> */}
                          <NumericFormat
                            id="votesValue"
                            name="votesValue"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.votesValue || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                votesValue: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ebdValue">Valor EBD</Label>
                          {/* <Input
                            id="ebdValue"
                            name="ebdValue"
                            type="text"
                            inputMode="decimal"
                            value={formData.ebdValue}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                              
                          /> */}
                          <NumericFormat
                            id="ebdValue"
                            name="ebdValue"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.ebdValue || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                ebdValue: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                                
                          />                          
                        </div>
                        
                        <div>
                          <Label htmlFor="campaignValue">Valor Campanha</Label>
                          {/* <Input
                            id="campaignValue"
                            name="campaignValue"
                            type="text"
                            inputMode="decimal"
                            value={formData.campaignValue}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                           
                          /> */}
                          <NumericFormat
                            id="campaignValue"
                            name="campaignValue"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.campaignValue || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                campaignValue: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                                     
                          />                             
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Campos específicos para Dízimo */}
                  {formData.type === 'DIZIMO' && (
                    <div className="space-y-4">
                      <div  className='grid grid-cols-2'>
                        <div>
                          <Label htmlFor="value">Valor</Label>
                          {/* <Input
                            id="value"
                            name="value"
                            type="text"
                            inputMode="decimal"
                            value={formData.value}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                         
                          /> */}
                          <NumericFormat
                            id="value"
                            name="value"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.value || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                value: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                                 
                          />                              
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isContributorRegistered"
                          name="isContributorRegistered"
                          checked={formData.isContributorRegistered}
                          disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                         
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
                            label="Buscar Contribuinte"
                            placeholder="Selecione o contribuinte"
                            value={formData.contributorId}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
                            onChange={(value) => handleSelectChange('contributorId', value)}
                            name="contributorId"
                            data={contributors.map(c => ({ id: c.id, name: c.name, document: c.cpf, cargo: c.ecclesiasticalPosition }))}
                            searchKeys={['name', 'document']}
                          />  
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="contributorName">Nome do Contribuinte</Label>
                          <Input
                            id="contributorName"
                            name="contributorName"
                            value={formData.contributorName}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}   
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Campos específicos para Saída */}
                  {formData.type === 'SAIDA' && (
                    <div className="space-y-4">
                      <div  className='grid grid-cols-2'>
                        <div>
                          <Label htmlFor="value">Valor</Label>
                          {/* <Input
                            id="value"
                            name="value"
                            type="text"
                            inputMode="decimal"
                            value={formData.value}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                          
                          /> */}
                          <NumericFormat
                            id="value"
                            name="value"
                            className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.value || ''}
                            onValueChange={(values) => {
                              const { floatValue } = values;
                              setFormData({
                                ...formData,
                                value: floatValue,
                              });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale={true}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                                
                          />                                  
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isSupplierRegistered"
                          name="isSupplierRegistered"
                          checked={formData.isSupplierRegistered}
                          disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                          
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
                            label="Buscar Fornecedor"
                            placeholder="Selecione o fornecedor"
                            value={formData.supplierId}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}  
                            onChange={(value) => handleSelectChange('supplierId', value)}
                            name="supplierId"
                            data={suppliers.map(s => ({ id: s.id, name: s.razaoSocial, document: s.cpfcnpj }))}
                            searchKeys={['name', 'document']}
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="supplierName">Nome do Fornecedor</Label>
                          <Input
                            id="supplierName"
                            name="supplierName"
                            value={formData.supplierName}
                            onChange={handleInputChange}
                            disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                        
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}                      
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={editingLaunch && editingLaunch.status !== 'NORMAL'}>
                      {editingLaunch ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          </div>
          {/* Filtros */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar em todos os campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4"> */}
            {/* Seus filtros existentes, como Status e Tipo, permanecem aqui */}

            {/* Seletor de Data de Início */}
            {/* <div className="flex-1">
              <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Data de Início
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Seletor de Data de Fim */}
            {/* <div className="flex-1">
              <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                Data de Fim
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>  */}

            
            <div className="w-full sm:w-64">
              <Select
                value={selectedCongregation}
                onValueChange={setSelectedCongregation}
              >
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

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Lista para Desktop */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle>Lançamentos Recentes</CardTitle>
                {/* <CardDescription>Lista de lançamentos financeiros</CardDescription> */}
                {/* <CardDescription>
                  {totalItems} lançamentos encontrados
              </CardDescription> */}
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
                              launch.type === 'ENTRADA' ? 'bg-green-500' : 
                              launch.type === 'DIZIMO' ? 'bg-blue-500' : 'bg-red-500'
                            }`}>
                              {launch.type === 'ENTRADA' ? 'Outras Receitas' : 
                               launch.type === 'DIZIMO' ? 'Dízimo' : 'Saída'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {launch.type === 'ENTRADA' ? (
                              <div className="space-y-1">
                                {launch.offerValue ? <div>Oferta: {formatCurrency(launch.offerValue)}</div> : null}
                                {launch.votesValue ? <div>Votos: {formatCurrency(launch.votesValue)}</div> : null}
                                {launch.ebdValue ? <div>EBD: {formatCurrency(launch.ebdValue)}</div> : null}
                                {launch.campaignValue ? <div>Campanha: {formatCurrency(launch.campaignValue)}</div> : null}
                              </div>
                            ) : (
                              <div>{formatCurrency(launch.value)}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {launch.contributor?.name || launch.supplier?.razaoSocial|| 
                             launch.contributorName || launch.supplierName || '-'}
                          </TableCell>
                          <TableCell>
                            {launch.talonNumber}
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
                          <TableCell>
                            <div className="flex space-x-2">
                              {(launch.type === 'ENTRADA' && canLaunchEntry) ||
                                   (launch.type === 'DIZIMO' && canLaunchTithe) ||
                                   (launch.type === 'SAIDA' && canLaunchExpense) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(launch)}
                                    //disabled={launch.status !== 'NORMAL' || !canEdit}
                                    disabled={!canLaunchEntry || !canLaunchTithe || !canLaunchExpense}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar</p>
                                </TooltipContent>
                              </Tooltip>
                              ) : null}

                              {launch.status === 'NORMAL' && (
                                <>
                                  {(launch.type === 'ENTRADA' && canApproveEntry) ||
                                   (launch.type === 'DIZIMO' && canApproveTithe) ||
                                   (launch.type === 'SAIDA' && canApproveExpense) ? (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleApprove(launch.id)}
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Aprovar</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </>
                                  ) : null}
                                </>
                              )}

                              {launch.status === 'APPROVED' && (
                                <>
                                  {(launch.type === 'ENTRADA' && canApproveEntry) ||
                                   (launch.type === 'DIZIMO' && canApproveTithe) ||
                                   (launch.type === 'SAIDA' && canApproveExpense) ? (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReprove(launch.id)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Desaprovar</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </>
                                  ) : null}
                                </>
                              )}

                              {launch.status =='NORMAL' && (canLaunchEntry || canLaunchExpense || canLaunchTithe)  ? (
                              <>           
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancel(launch.id)}
                                    // disabled={launch.status !== 'NORMAL' ? null : null}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cancelar</p>
                                </TooltipContent>
                              </Tooltip>
                             </>) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                              
                {/* Componente de paginação */}
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

          {/* Lista para Mobile */}
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