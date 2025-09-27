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
  entradaAccountPlan?: string
  entradaFinancialEntity?: string
  entradaPaymentMethod?: string
  // Campos para Dízimo
  dizimoAccountPlan?: string
  dizimoFinancialEntity?: string
  dizimoPaymentMethod?: string
  // Campos para Saída
  saidaAccountPlan?: string
  saidaFinancialEntity?: string
  saidaPaymentMethod?: string
  matriculaEnergisa?: String
matriculaIgua?: String
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
    // Campos para Entrada
    entradaAccountPlan: '',
    entradaFinancialEntity: '',
    entradaPaymentMethod: '',
    // Campos para Dízimo
    dizimoAccountPlan: '',
    dizimoFinancialEntity: '',
    dizimoPaymentMethod: '',
    // Campos para Saída
    saidaAccountPlan: '',
    saidaFinancialEntity: '',
    saidaPaymentMethod: '',
    matriculaEnergisa: '',
    matriculaIgua: ''
  })
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

  // Filtrar congregações com base no termo de pesquisa
  const filteredCongregations = useMemo(() => {
    if (!searchTerm) return congregations
    
    return congregations.filter(congregation =>
      congregation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      congregation.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [congregations, searchTerm])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/congregations'
      const method = editingCongregation ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingCongregation ? { ...formData, id: editingCongregation.id } : formData)
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
      // Campos para Entrada
      entradaAccountPlan: congregation.entradaAccountPlan || '',
      entradaFinancialEntity: congregation.entradaFinancialEntity || '',
      entradaPaymentMethod: congregation.entradaPaymentMethod || '',
      // Campos para Dízimo
      dizimoAccountPlan: congregation.dizimoAccountPlan || '',
      dizimoFinancialEntity: congregation.dizimoFinancialEntity || '',
      dizimoPaymentMethod: congregation.dizimoPaymentMethod || '',
      // Campos para Saída
      saidaAccountPlan: congregation.saidaAccountPlan || '',
      saidaFinancialEntity: congregation.saidaFinancialEntity || '',
      saidaPaymentMethod: congregation.saidaPaymentMethod || '',
            // Novos campos
      matriculaEnergisa: congregation.matriculaEnergisa || '',
      matriculaIgua: congregation.matriculaIgua || ''
    })
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
      // Campos para Entrada
      entradaAccountPlan: '',
      entradaFinancialEntity: '',
      entradaPaymentMethod: '',
      // Campos para Dízimo
      dizimoAccountPlan: '',
      dizimoFinancialEntity: '',
      dizimoPaymentMethod: '',
      // Campos para Saída
      saidaAccountPlan: '',
      saidaFinancialEntity: '',
      saidaPaymentMethod: '',
      // Novos campos
      matriculaEnergisa: '',
      matriculaIgua: '',
    })
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
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCongregation ? 'Editar Congregação' : 'Nova Congregação'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da congregação
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
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
                    </div>

                    <Tabs defaultValue="dizimo" className="w-full mt-4 space-x-10">
                      <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="dizimo">Dízimo</TabsTrigger>
                          <TabsTrigger value="entrada">Out Receitas</TabsTrigger>
                          <TabsTrigger value="saida">Saída</TabsTrigger>
                          <TabsTrigger value="outros">Outros</TabsTrigger>
                      </TabsList>
                      <TabsContent value="entrada" className="space-y-4 mt-4">
                          <div>
                              <Label htmlFor="entradaAccountPlan">Plano de Contas</Label>
                              <Input
                                  id="entradaAccountPlan"
                                  name="entradaAccountPlan"
                                  value={formData.entradaAccountPlan}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>
                          <div>
                              <Label htmlFor="entradaFinancialEntity">Entidade Financeira</Label>
                              <Input
                                  id="entradaFinancialEntity"
                                  name="entradaFinancialEntity"
                                  value={formData.entradaFinancialEntity}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>
                          <div>
                              <Label htmlFor="entradaPaymentMethod">Método de Pagamento</Label>
                              <Input
                                  id="entradaPaymentMethod"
                                  name="entradaPaymentMethod"
                                  value={formData.entradaPaymentMethod}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>                          
                      </TabsContent>
                      <TabsContent value="dizimo" className="space-y-4 mt-4">
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
                      <TabsContent value="saida" className="space-y-4 mt-4">
                          <div>
                              <Label htmlFor="saidaAccountPlan">Plano de Contas</Label>
                              <Input
                                  id="saidaAccountPlan"
                                  name="saidaAccountPlan"
                                  value={formData.saidaAccountPlan}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>
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

                      <TabsContent value="outros" className="space-y-4 mt-4">
                          <div>
                              <Label htmlFor="saidaAccountPlan">Energisa</Label>
                              <Input
                                  id="saidaAccountPlan"
                                  name="saidaAccountPlan"
                                  value={formData.matriculaEnergisa}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>
                          <div>
                              <Label htmlFor="saidaFinancialEntity">Iguá</Label>
                              <Input
                                  id="saidaFinancialEntity"
                                  name="saidaFinancialEntity"
                                  value={formData.matriculaIgua}
                                  onChange={handleInputChange}
                                  placeholder=""
                              />
                          </div>                                
                      </TabsContent>                      
                      
                      </Tabs>
                      <DialogFooter>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nome Regional</TableHead>
                    {/* <TableHead>Configurações</TableHead> */}
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCongregations.map((congregation) => (
                    <TableRow key={congregation.id}>
                      <TableCell>
                        <Badge variant="outline">{congregation.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{congregation.name}</TableCell>
                      <TableCell className="font-medium">{congregation.regionalName}</TableCell>
                      {/* <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            Entrada: {congregation.entradaAccountPlan || 'Não configurado'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Dízimo: {congregation.dizimoAccountPlan || 'Não configurado'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Saída: {congregation.saidaAccountPlan || 'Não configurado'}
                          </Badge>
                        </div>
                      </TableCell> */}
                      <TableCell>
                        {format(new Date(congregation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(congregation)}
                            disabled={!canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(congregation.id)}
                            disabled={!canExclude}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
