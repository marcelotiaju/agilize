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
  }, [])

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
          <div className="flex justify-between items-center mb-6">
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
                <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCongregation ? 'Editar Congregação' : 'Nova Congregação'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da congregação
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-2">
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="code" className="text-right">
                          Código
                        </Label>
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          className="col-span-3"
                          required
                        //placeholder="Ex: CG001"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Nome
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="col-span-3"
                          required
                          placeholder="Nome da congregação"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="regionalName" className="text-Left">
                          Nome Regional
                        </Label>
                        <Input
                          id="regionalName"
                          name="regionalName"
                          value={formData.regionalName}
                          onChange={handleInputChange}
                          className="col-span-3"
                          required
                          placeholder="Nome Regional"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">
                          Ativo
                        </Label>
                        <Input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>

                    <Tabs defaultValue="dizimo" className="w-full mt-4 space-x-10">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="dizimo">Dízimo</TabsTrigger>
                        <TabsTrigger value="ofertaCulto">Oferta</TabsTrigger>
                        <TabsTrigger value="mission">Missão</TabsTrigger>
                        <TabsTrigger value="circulo">Círculo</TabsTrigger>
                        <TabsTrigger value="votos">Votos</TabsTrigger>
                        <TabsTrigger value="ebd">EBD</TabsTrigger>
                        <TabsTrigger value="campaign">Campanha</TabsTrigger>
                        <TabsTrigger value="carneReviver">Carnê R.</TabsTrigger>
                        <TabsTrigger value="saida">Saídas</TabsTrigger>
                        <TabsTrigger value="outros">Outros</TabsTrigger>
                      </TabsList>

                      {/* Nova aba dedicada para Oferta do Culto */}
                      <TabsContent value="ofertaCulto" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="entradaOfferAccountPlan">Plano de Contas</Label>
                          <Input
                            id="entradaOfferAccountPlan"
                            name="entradaOfferAccountPlan"
                            value={formData.entradaOfferAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaOfferFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="entradaOfferFinancialEntity"
                            name="entradaOfferFinancialEntity"
                            value={formData.entradaOfferFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaOfferPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="entradaOfferPaymentMethod"
                            name="entradaOfferPaymentMethod"
                            value={formData.entradaOfferPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="ebd" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="entradaEbdAccountPlan">Plano de Contas</Label>
                          <Input
                            id="entradaEbdAccountPlan"
                            name="entradaEbdAccountPlan"
                            value={formData.entradaEbdAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaEbdFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="entradaEbdFinancialEntity"
                            name="entradaEbdFinancialEntity"
                            value={formData.entradaEbdFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaEbdPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="entradaEbdPaymentMethod"
                            name="entradaEbdPaymentMethod"
                            value={formData.entradaEbdPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="campaign" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="entradaCampaignAccountPlan">Plano de Contas</Label>
                          <Input
                            id="entradaCampaignAccountPlan"
                            name="entradaCampaignAccountPlan"
                            value={formData.entradaCampaignAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaCampaignFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="entradaCampaignFinancialEntity"
                            name="entradaCampaignFinancialEntity"
                            value={formData.entradaCampaignFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaCampaignPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="entradaCampaignPaymentMethod"
                            name="entradaCampaignPaymentMethod"
                            value={formData.entradaCampaignPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="votos" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="entradaVotesAccountPlan">Plano de Contas</Label>
                          <Input
                            id="entradaVotesAccountPlan"
                            name="entradaVotesAccountPlan"
                            value={formData.entradaVotesAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaVotesFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="entradaVotesFinancialEntity"
                            name="entradaVotesFinancialEntity"
                            value={formData.entradaVotesFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaVotesPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="entradaVotesPaymentMethod"
                            name="entradaVotesPaymentMethod"
                            value={formData.entradaVotesPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="dizimo" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="dizimoAccountPlan">Plano de Contas</Label>
                          <Input
                            id="dizimoAccountPlan"
                            name="dizimoAccountPlan"
                            value={formData.dizimoAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="dizimoFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="dizimoFinancialEntity"
                            name="dizimoFinancialEntity"
                            value={formData.dizimoFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="dizimoPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="dizimoPaymentMethod"
                            name="dizimoPaymentMethod"
                            value={formData.dizimoPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="mission" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="missionAccountPlan">Plano de Contas</Label>
                          <Input
                            id="missionAccountPlan"
                            name="missionAccountPlan"
                            value={formData.missionAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="missionFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="missionFinancialEntity"
                            name="missionFinancialEntity"
                            value={formData.missionFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="missionPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="missionPaymentMethod"
                            name="missionPaymentMethod"
                            value={formData.missionPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="circulo" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="circleAccountPlan">Plano de Contas</Label>
                          <Input
                            id="circleAccountPlan"
                            name="circleAccountPlan"
                            value={formData.circleAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="circleFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="circleFinancialEntity"
                            name="circleFinancialEntity"
                            value={formData.circleFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="circlePaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="circlePaymentMethod"
                            name="circlePaymentMethod"
                            value={formData.circlePaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="carneReviver" className="space-y-4 mt-6">
                        <div>
                          <Label htmlFor="entradaCarneReviverAccountPlan">Plano de Contas</Label>
                          <Input
                            id="entradaCarneReviverAccountPlan"
                            name="entradaCarneReviverAccountPlan"
                            value={formData.entradaCarneReviverAccountPlan}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaCarneReviverFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="entradaCarneReviverFinancialEntity"
                            name="entradaCarneReviverFinancialEntity"
                            value={formData.entradaCarneReviverFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="entradaCarneReviverPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="entradaCarneReviverPaymentMethod"
                            name="entradaCarneReviverPaymentMethod"
                            value={formData.entradaCarneReviverPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="saida" className="space-y-4 mt-6">
                        {/*<div>
                              <Label htmlFor="saidaAccountPlan">Plano de Contas</Label>
                              <Input
                                  id="saidaAccountPlan"
                                  name="saidaAccountPlan"
                                  value={formData.saidaAccountPlan}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>*/}
                        <div>
                          <Label htmlFor="saidaFinancialEntity">Entidade Financeira</Label>
                          <Input
                            id="saidaFinancialEntity"
                            name="saidaFinancialEntity"
                            value={formData.saidaFinancialEntity}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label htmlFor="saidaPaymentMethod">Método de Pagamento</Label>
                          <Input
                            id="saidaPaymentMethod"
                            name="saidaPaymentMethod"
                            value={formData.saidaPaymentMethod}
                            onChange={handleInputChange}
                            placeholder=""
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="outros" className="space-y-4 mt-6">
                        <div>
                          <Label>Matriculas Energisa</Label>
                          <div className="space-y-2">
                            {matriculaEnergisaList.map((m, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <Input
                                  value={m}
                                  onChange={(e) => {
                                    const next = [...matriculaEnergisaList]
                                    next[idx] = e.target.value
                                    setMatriculaEnergisaList(next)
                                  }}
                                  placeholder="Informe uma matrícula"
                                />
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setMatriculaEnergisaList(prev => prev.filter((_, i) => i !== idx))
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" onClick={() => setMatriculaEnergisaList(prev => [...prev, ''])}>
                              <Plus className="mr-2 h-4 w-4" /> Adicionar matrícula
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label>Matriculas Iguá</Label>
                          <div className="space-y-2">
                            {matriculaIguaList.map((m, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <Input
                                  value={m}
                                  onChange={(e) => {
                                    const next = [...matriculaIguaList]
                                    next[idx] = e.target.value
                                    setMatriculaIguaList(next)
                                  }}
                                  placeholder="Informe uma matrícula"
                                />
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setMatriculaIguaList(prev => prev.filter((_, i) => i !== idx))
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" onClick={() => setMatriculaIguaList(prev => [...prev, ''])}>
                              <Plus className="mr-2 h-4 w-4" /> Adicionar matrícula
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

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
                  <Button variant="outline" onClick={resetImportForm}>
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
