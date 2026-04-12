'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Church, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


interface Congregation {
  id: string
  code: string
  name: string
  regionalName?: string
  createdAt: string
  // Oferta do Culto (antes estava como entradaOffer dentro de Out Receitas)
  entradaOfferAccountPlan?: string
  entradaOfferFinancialEntity?: string
  entradaOfferPaymentMethod?: string
  entradaEbdAccountPlan?: string
  entradaEbdFinancialEntity?: string
  entradaEbdPaymentMethod?: string
  entradaCampaignAccountPlan?: string
  entradaCampaignFinancialEntity?: string
  entradaCampaignPaymentMethod?: string
  entradaVotesAccountPlan?: string
  entradaVotesFinancialEntity?: string
  entradaVotesPaymentMethod?: string
  entradaCarneReviverAccountPlan?: string
  entradaCarneReviverFinancialEntity?: string
  entradaCarneReviverPaymentMethod?: string
  // Campos para Carnê Africa
  entradaCarneAfricaAccountPlan?: string
  entradaCarneAfricaFinancialEntity?: string
  entradaCarneAfricaPaymentMethod?: string
  // Campos para Renda Bruta
  entradaRendaBrutaAccountPlan?: string
  entradaRendaBrutaFinancialEntity?: string
  entradaRendaBrutaPaymentMethod?: string
  // Campos para Dízimo
  dizimoAccountPlan?: string
  dizimoFinancialEntity?: string
  dizimoPaymentMethod?: string
  // Campos para Saída
  saidaFinancialEntity?: string
  saidaPaymentMethod?: string
  // Outros campos
  matriculaEnergisa?: String
  matriculaIgua?: String
  // Campos Missao e Circulo podem ser adicionados aqui
  missionAccountPlan?: string
  missionFinancialEntity?: string
  missionPaymentMethod?: string
  circleAccountPlan?: string
  circleFinancialEntity?: string
  circlePaymentMethod?: string
  isActive: boolean
}

export default function Congregations() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null)
  const [openCollapsibles, setOpenCollapsibles] = useState({
    entrada: false,
    dizimo: false,
    saida: false
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [financialEntities, setFinancialEntities] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    regionalName: '',
    // Campos para Oferta do Culto (separado)
    entradaOfferAccountPlan: '',
    entradaOfferFinancialEntity: '',
    entradaOfferPaymentMethod: '',
    entradaEbdAccountPlan: '',
    entradaEbdFinancialEntity: '',
    entradaEbdPaymentMethod: '',
    entradaCampaignAccountPlan: '',
    entradaCampaignFinancialEntity: '',
    entradaCampaignPaymentMethod: '',
    entradaVotesAccountPlan: '',
    entradaVotesFinancialEntity: '',
    entradaVotesPaymentMethod: '',
    entradaCarneReviverAccountPlan: '',
    entradaCarneReviverFinancialEntity: '',
    entradaCarneReviverPaymentMethod: '',
    // Campos para Carnê Africa
    entradaCarneAfricaAccountPlan: '',
    entradaCarneAfricaFinancialEntity: '',
    entradaCarneAfricaPaymentMethod: '',
    // Campos para Renda Bruta
    entradaRendaBrutaAccountPlan: '',
    entradaRendaBrutaFinancialEntity: '',
    entradaRendaBrutaPaymentMethod: '',
    // Campos para Dízimo
    dizimoAccountPlan: '',
    dizimoFinancialEntity: '',
    dizimoPaymentMethod: '',
    // Campos para Saída
    saidaFinancialEntity: '',
    saidaPaymentMethod: '',
    // matriculas agora gerenciadas como listas abaixo
    matriculaEnergisa: '',
    matriculaIgua: '',
    // Campos Missao e Circulo podem ser adicionados aqui
    missionAccountPlan: '',
    missionFinancialEntity: '',
    missionPaymentMethod: '',
    circleAccountPlan: '',
    circleFinancialEntity: '',
    circlePaymentMethod: '',
    isActive: true,
  })
  // listas para múltiplas matrículas
  const [matriculaEnergisaList, setMatriculaEnergisaList] = useState<string[]>([])
  const [matriculaIguaList, setMatriculaIguaList] = useState<string[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  // Verificar permissões
  const canCreate = session?.user?.canCreate
  const canEdit = session?.user?.canEdit
  const canExclude = session?.user?.canExclude

  useEffect(() => {
    fetchCongregations()
    fetchFinancialEntities()
    fetchPaymentMethods()
  }, [])

  const fetchFinancialEntities = async () => {
    try {
      const response = await fetch('/api/financial-entities?congregationId=all')
      if (response.ok) {
        const data = await response.json()
        setFinancialEntities(data)
      }
    } catch (error) {
      console.error('Erro ao carregar entidades financeiras:', error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods')
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data)
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error)
    }
  }

  const fetchCongregations = async () => {
    try {
      const response = await fetch('/api/congregations/all')
      if (response.ok) {
        const data = await response.json()
        setCongregations(data)
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error)
    }
  }

  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Filtrar congregações com base no termo de pesquisa
  const filteredCongregations = useMemo(() => {
    if (!searchTerm) return congregations
    const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase())

    return congregations.filter(congregation => {
      const normalizedName = removeAccents(congregation.name.toLowerCase())
      const normalizedCode = removeAccents(congregation.code.toLowerCase())
      return normalizedName.includes(normalizedSearchTerm) ||
        normalizedCode.includes(normalizedSearchTerm)
    })
  }, [congregations, searchTerm])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const finalValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/congregations'
      const method = editingCongregation ? 'PUT' : 'POST'

      // Serializar listas de matrícula para string compatível com API/DB
      const payload = {
        ...formData,
        matriculaEnergisa: matriculaEnergisaList.join(','),
        matriculaIgua: matriculaIguaList.join(','),
        ...(editingCongregation ? { id: editingCongregation.id } : {})
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        fetchCongregations()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar congregação')
      }
    } catch (error) {
      console.error('Erro ao salvar congregação:', error)
      alert('Erro ao salvar congregação')
    }
  }


  const handleEdit = (congregation: Congregation) => {
    setEditingCongregation(congregation)
    setFormData({
      code: congregation.code,
      name: congregation.name,
      regionalName: congregation.regionalName || '',
      // Oferta do Culto — mantém compatibilidade com registros antigos que usam entradaOffer*
      entradaOfferAccountPlan: (congregation.entradaOfferAccountPlan || (congregation as any).entradaOfferAccountPlan) || '',
      entradaOfferFinancialEntity: (congregation.entradaOfferFinancialEntity || (congregation as any).entradaOfferFinancialEntity) || '',
      entradaOfferPaymentMethod: (congregation.entradaOfferPaymentMethod || (congregation as any).entradaOfferPaymentMethod) || '',
      entradaEbdAccountPlan: congregation.entradaEbdAccountPlan || '',
      entradaEbdFinancialEntity: congregation.entradaEbdFinancialEntity || '',
      entradaEbdPaymentMethod: congregation.entradaEbdPaymentMethod || '',
      entradaCampaignAccountPlan: congregation.entradaCampaignAccountPlan || '',
      entradaCampaignFinancialEntity: congregation.entradaCampaignFinancialEntity || '',
      entradaCampaignPaymentMethod: congregation.entradaCampaignPaymentMethod || '',
      entradaVotesAccountPlan: congregation.entradaVotesAccountPlan || '',
      entradaVotesFinancialEntity: congregation.entradaVotesFinancialEntity || '',
      entradaVotesPaymentMethod: congregation.entradaVotesPaymentMethod || '',
      entradaCarneReviverAccountPlan: congregation.entradaCarneReviverAccountPlan || '',
      entradaCarneReviverFinancialEntity: congregation.entradaCarneReviverFinancialEntity || '',
      entradaCarneReviverPaymentMethod: congregation.entradaCarneReviverPaymentMethod || '',
      // Campos para Carnê Africa
      entradaCarneAfricaAccountPlan: congregation.entradaCarneAfricaAccountPlan || '',
      entradaCarneAfricaFinancialEntity: congregation.entradaCarneAfricaFinancialEntity || '',
      entradaCarneAfricaPaymentMethod: congregation.entradaCarneAfricaPaymentMethod || '',
      // Campos para Renda Bruta
      entradaRendaBrutaAccountPlan: congregation.entradaRendaBrutaAccountPlan || '',
      entradaRendaBrutaFinancialEntity: congregation.entradaRendaBrutaFinancialEntity || '',
      entradaRendaBrutaPaymentMethod: congregation.entradaRendaBrutaPaymentMethod || '',
      // Campos para Dízimo
      dizimoAccountPlan: congregation.dizimoAccountPlan || '',
      dizimoFinancialEntity: congregation.dizimoFinancialEntity || '',
      dizimoPaymentMethod: congregation.dizimoPaymentMethod || '',
      // Campos para Saída
      saidaFinancialEntity: congregation.saidaFinancialEntity || '',
      saidaPaymentMethod: congregation.saidaPaymentMethod || '',
      // Novos campos
      matriculaEnergisa: congregation.matriculaEnergisa || '',
      matriculaIgua: congregation.matriculaIgua || '',
      // Campos Missao e Circulo podem ser adicionados aqui
      missionAccountPlan: congregation.missionAccountPlan || '',
      missionFinancialEntity: congregation.missionFinancialEntity || '',
      missionPaymentMethod: congregation.missionPaymentMethod || '',
      circleAccountPlan: congregation.circleAccountPlan || '',
      circleFinancialEntity: congregation.circleFinancialEntity || '',
      circlePaymentMethod: congregation.circlePaymentMethod || '',
      isActive: congregation.isActive,
    })
    // popular listas a partir da string armazenada (compatibilidade com DB)
    setMatriculaEnergisaList(
      (congregation.matriculaEnergisa || '').split(',').map(s => s.trim()).filter(Boolean)
    )
    setMatriculaIguaList(
      (congregation.matriculaIgua || '').split(',').map(s => s.trim()).filter(Boolean)
    )
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta congregação?')) {
      return
    }

    try {
      const response = await fetch(`/api/congregations?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCongregations()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir congregação')
      }
    } catch (error) {
      console.error('Erro ao excluir congregação:', error)
      alert('Erro ao excluir congregação')
    }
  }

  const toggleCollapsible = (type: any) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const resetForm = () => {
    setEditingCongregation(null)
    setOpenCollapsibles({
      entrada: false,
      dizimo: false,
      saida: false
    })
    setFormData({
      code: '',
      name: '',
      regionalName: '',
      // Oferta do Culto
      entradaOfferAccountPlan: '',
      entradaOfferFinancialEntity: '',
      entradaOfferPaymentMethod: '',
      // Campos para Entrada
      entradaEbdAccountPlan: '',
      entradaEbdFinancialEntity: '',
      entradaEbdPaymentMethod: '',
      entradaCampaignAccountPlan: '',
      entradaCampaignFinancialEntity: '',
      entradaCampaignPaymentMethod: '',
      entradaVotesAccountPlan: '',
      entradaVotesFinancialEntity: '',
      entradaVotesPaymentMethod: '',
      entradaCarneReviverAccountPlan: '',
      entradaCarneReviverFinancialEntity: '',
      entradaCarneReviverPaymentMethod: '',
      // Campos para Carnê Africa
      entradaCarneAfricaAccountPlan: '',
      entradaCarneAfricaFinancialEntity: '',
      entradaCarneAfricaPaymentMethod: '',
      // Campos para Renda Bruta
      entradaRendaBrutaAccountPlan: '',
      entradaRendaBrutaFinancialEntity: '',
      entradaRendaBrutaPaymentMethod: '',
      // Campos para Dízimo
      dizimoAccountPlan: '',
      dizimoFinancialEntity: '',
      dizimoPaymentMethod: '',
      // Campos para Saída
      saidaFinancialEntity: '',
      saidaPaymentMethod: '',
      // Novos campos
      matriculaEnergisa: '',
      matriculaIgua: '',
      // Campos Missao e Circulo podem ser adicionados aqui
      missionAccountPlan: '',
      missionFinancialEntity: '',
      missionPaymentMethod: '',
      circleAccountPlan: '',
      circleFinancialEntity: '',
      circlePaymentMethod: '',
      isActive: true,
    })
    setMatriculaEnergisaList([])
    setMatriculaIguaList([])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file /*&& file.type === 'text/csv'*/) {
      setCsvFile(file)
    } else {
      alert('Por favor, selecione um arquivo CSV válido')
      e.target.value = ''
    }
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

      const response = await fetch('/api/congregations/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} congregações importadas com sucesso.`)
        fetchCongregations()
        setIsImportDialogOpen(false)
        setCsvFile(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao importar arquivo CSV')
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

  return (

    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:pl-64">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Congregações</h1>
              {/* <p className="text-gray-600">Gerencie as congregações da igreja</p> */}
            </div>

            <div className="flex space-x-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}
                    disabled={!canCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Congregação
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-screen sm:w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCongregation ? 'Editar Congregação' : 'Nova Congregação'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da congregação
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-2 py-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Label htmlFor="code" className="text-left sm:min-w-fit">
                          Código
                        </Label>
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          className="flex-1"
                          required
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Label htmlFor="name" className="text-left sm:min-w-fit">
                          Nome
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="flex-1"
                          required
                          placeholder="Nome da congregação"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Label htmlFor="regionalName" className="text-left sm:min-w-fit">
                          Nome Regional
                        </Label>
                        <Input
                          id="regionalName"
                          name="regionalName"
                          value={formData.regionalName}
                          onChange={handleInputChange}
                          className="flex-1"
                          required
                          placeholder="Nome Regional"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Label htmlFor="isActive" className="text-left">
                          Ativo
                        </Label>
                        <Input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="h-4 w-4 flex-1"
                        />
                      </div>
                    </div>

                    <Tabs defaultValue="dizimo" className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 mb-36 sm:mb-20 bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger value="dizimo">Dízimo</TabsTrigger>
                        <TabsTrigger value="ofertaCulto">Oferta do Culto</TabsTrigger>
                        <TabsTrigger value="mission">Missão</TabsTrigger>
                        <TabsTrigger value="circulo">Círculo de Oração</TabsTrigger>
                        <TabsTrigger value="votos">Votos</TabsTrigger>
                        <TabsTrigger value="ebd">EBD</TabsTrigger>
                        <TabsTrigger value="campaign">Campanha</TabsTrigger>
                        <TabsTrigger value="carneReviver">Carnê Reviver</TabsTrigger>
                        <TabsTrigger value="carneAfrica">Carnê África</TabsTrigger>
                        <TabsTrigger value="rendaBruta">Renda Bruta</TabsTrigger>
                        <TabsTrigger value="saida">Saídas</TabsTrigger>
                        <TabsTrigger value="outros">Outros</TabsTrigger>
                      </TabsList>

                      <div className="space-y-4">

                      {/* Nova aba dedicada para Oferta do Culto */}
                      <TabsContent value="ofertaCulto" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaOfferAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaOfferAccountPlan"
                              name="entradaOfferAccountPlan"
                              value={formData.entradaOfferAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaOfferFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaOfferFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaOfferFinancialEntity: value }))}>
                              <SelectTrigger id="entradaOfferFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaOfferPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaOfferPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaOfferPaymentMethod: value }))}>
                              <SelectTrigger id="entradaOfferPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="ebd" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaEbdAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaEbdAccountPlan"
                              name="entradaEbdAccountPlan"
                              value={formData.entradaEbdAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaEbdFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaEbdFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaEbdFinancialEntity: value }))}>
                              <SelectTrigger id="entradaEbdFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaEbdPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaEbdPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaEbdPaymentMethod: value }))}>
                              <SelectTrigger id="entradaEbdPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="campaign" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaCampaignAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaCampaignAccountPlan"
                              name="entradaCampaignAccountPlan"
                              value={formData.entradaCampaignAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCampaignFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaCampaignFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCampaignFinancialEntity: value }))}>
                              <SelectTrigger id="entradaCampaignFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCampaignPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaCampaignPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCampaignPaymentMethod: value }))}>
                              <SelectTrigger id="entradaCampaignPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="votos" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaVotesAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaVotesAccountPlan"
                              name="entradaVotesAccountPlan"
                              value={formData.entradaVotesAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaVotesFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaVotesFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaVotesFinancialEntity: value }))}>
                              <SelectTrigger id="entradaVotesFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaVotesPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaVotesPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaVotesPaymentMethod: value }))}>
                              <SelectTrigger id="entradaVotesPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="dizimo" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="dizimoAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="dizimoAccountPlan"
                              name="dizimoAccountPlan"
                              value={formData.dizimoAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="dizimoFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.dizimoFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, dizimoFinancialEntity: value }))}>
                              <SelectTrigger id="dizimoFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="dizimoPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.dizimoPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, dizimoPaymentMethod: value }))}>
                              <SelectTrigger id="dizimoPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="mission" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="missionAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="missionAccountPlan"
                              name="missionAccountPlan"
                              value={formData.missionAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="missionFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.missionFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, missionFinancialEntity: value }))}>
                              <SelectTrigger id="missionFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="missionPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.missionPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, missionPaymentMethod: value }))}>
                              <SelectTrigger id="missionPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="circulo" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="circleAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="circleAccountPlan"
                              name="circleAccountPlan"
                              value={formData.circleAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="circleFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.circleFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, circleFinancialEntity: value }))}>
                              <SelectTrigger id="circleFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="circlePaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.circlePaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, circlePaymentMethod: value }))}>
                              <SelectTrigger id="circlePaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="carneReviver" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneReviverAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaCarneReviverAccountPlan"
                              name="entradaCarneReviverAccountPlan"
                              value={formData.entradaCarneReviverAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneReviverFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaCarneReviverFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCarneReviverFinancialEntity: value }))}>
                              <SelectTrigger id="entradaCarneReviverFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneReviverPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaCarneReviverPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCarneReviverPaymentMethod: value }))}>
                              <SelectTrigger id="entradaCarneReviverPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="carneAfrica" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneAfricaAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaCarneAfricaAccountPlan"
                              name="entradaCarneAfricaAccountPlan"
                              value={formData.entradaCarneAfricaAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneAfricaFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaCarneAfricaFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCarneAfricaFinancialEntity: value }))}>                          
                              <SelectTrigger id="entradaCarneAfricaFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaCarneAfricaPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaCarneAfricaPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaCarneAfricaPaymentMethod: value }))}>                         
                              <SelectTrigger id="entradaCarneAfricaPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="rendaBruta" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="entradaRendaBrutaAccountPlan" className="text-sm">Plano de Contas</Label>
                            <Input
                              id="entradaRendaBrutaAccountPlan"
                              name="entradaRendaBrutaAccountPlan"
                              value={formData.entradaRendaBrutaAccountPlan}
                              onChange={handleInputChange}
                              placeholder=""
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaRendaBrutaFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.entradaRendaBrutaFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaRendaBrutaFinancialEntity: value }))}>                           
                              <SelectTrigger id="entradaRendaBrutaFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="entradaRendaBrutaPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.entradaRendaBrutaPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, entradaRendaBrutaPaymentMethod: value }))}>                            
                              <SelectTrigger id="entradaRendaBrutaPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="saida" className="space-y-3 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1">
                            <Label htmlFor="saidaFinancialEntity" className="text-sm">Entidade Financeira</Label>
                            <Select value={formData.saidaFinancialEntity} onValueChange={(value) => setFormData(prev => ({ ...prev, saidaFinancialEntity: value }))}>
                              <SelectTrigger id="saidaFinancialEntity" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {financialEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()} className="text-sm">
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="saidaPaymentMethod" className="text-sm">Forma de Pagamento</Label>
                            <Select value={formData.saidaPaymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, saidaPaymentMethod: value }))}>
                              <SelectTrigger id="saidaPaymentMethod" className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.id} value={method.id.toString()} className="text-sm">
                                    {method.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="outros" className="space-y-4 mt-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1">
                            <Label>Matrículas Energisa</Label>
                            <div className="space-y-2 mt-2">
                              {matriculaEnergisaList.map((m, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input
                                    value={m}
                                    onChange={(e) => {
                                      const next = [...matriculaEnergisaList]
                                      next[idx] = e.target.value
                                      setMatriculaEnergisaList(next)
                                    }}
                                    placeholder="Informe uma matrícula"
                                    className="text-sm"
                                  />
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setMatriculaEnergisaList(prev => prev.filter((_, i) => i !== idx))
                                  }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" onClick={() => setMatriculaEnergisaList(prev => [...prev, ''])} className="text-xs">
                                <Plus className="mr-2 h-3 w-3" /> Adicionar
                              </Button>
                            </div>
                          </div>

                          <div className="flex-1">
                            <Label>Matrículas Iguá</Label>
                            <div className="space-y-2 mt-2">
                              {matriculaIguaList.map((m, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input
                                    value={m}
                                    onChange={(e) => {
                                      const next = [...matriculaIguaList]
                                      next[idx] = e.target.value
                                      setMatriculaIguaList(next)
                                    }}
                                    placeholder="Informe uma matrícula"
                                    className="text-sm"
                                  />
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setMatriculaIguaList(prev => prev.filter((_, i) => i !== idx))
                                  }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" onClick={() => setMatriculaIguaList(prev => [...prev, ''])} className="text-xs">
                                <Plus className="mr-2 h-3 w-3" /> Adicionar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      </div>
                    </Tabs>
                    <DialogFooter className='mt-2'>
                      <Button type="submit">
                        {editingCongregation ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={resetImportForm} className="ml-2">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Importar Congregações via CSV</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo CSV com as congregações. O arquivo deve ter as colunas: código, nome
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

                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      <p className="font-medium mb-2">Formato esperado do CSV:</p>
                      <p className="text-xs font-mono">código,nome,nome_regional</p>
                      <p className="text-xs font-mono">001,Primeira Igreja,Regional Norte</p>
                      <p className="text-xs font-mono">002,Segunda Igreja,Regional Sul</p>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a
                          href="/exemplo-congregacoes.csv"
                          download
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          📥 Baixar arquivo de exemplo
                        </a>
                      </div>
                    </div>
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
            </div>
          </div>

          {/* Campo de pesquisa */}
          <div className="mb-6">
            <SearchInput
              placeholder="Pesquisar congregações por Codigo ou nome..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="max-w-md"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Congregações</CardTitle>
              {/* <CardDescription>Lista de congregações cadastradas</CardDescription> */}
              <CardDescription>
                {filteredCongregations.length} congregações encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop / tablet table */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead className="">Nome</TableHead>
                      <TableHead className="hidden lg:table-cell">Nome Regional</TableHead>
                      <TableHead className="hidden lg:table-cell w-32">Data de Criação</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCongregations.map((congregation) => (
                      <TableRow key={congregation.id}>
                        <TableCell className="truncate">
                          <Badge variant="outline">{congregation.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium truncate">{congregation.name}</TableCell>
                        <TableCell className="font-medium truncate hidden lg:table-cell">{congregation.regionalName}</TableCell>
                        <TableCell className="truncate hidden lg:table-cell">
                          {format(new Date(congregation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(congregation.id)}
                              disabled={!canExclude}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(congregation)}
                              disabled={!canEdit}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3">
                {filteredCongregations.map((congregation) => (
                  <div
                    key={congregation.id}
                    className="bg-white border rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{congregation.code}</Badge>
                          <p className="font-medium truncate">{congregation.name}</p>
                        </div>
                        {congregation.regionalName && (
                          <p className="text-sm text-muted-foreground truncate mt-1">{congregation.regionalName}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(congregation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2 ml-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(congregation.id)}
                          disabled={!canExclude}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(congregation)}
                          disabled={!canEdit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
