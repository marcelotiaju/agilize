'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Building2, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { SearchInput } from '@/components/ui/search-input'

interface Supplier {
  id: string
  code: string
  razaoSocial: string
  tipoPessoa: string
  cpfCnpj: string
  createdAt: string
  updatedAt: string
}

export default function Suppliers() {
  const { data: session } = useSession()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    razaoSocial: '',
    tipoPessoa: 'FISICA',
    cpfCnpj: '',
    isActive: true
  })

  // Verificar permissões
  const canCreate = session?.user?.canCreate
  const canEdit = session?.user?.canEdit
  const canExclude = session?.user?.canExclude

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    }
  }


  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Filtrar fornecedores com base no termo de pesquisa
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers
    const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase())

    return suppliers.filter(supplier => {
      const normalizedRazaoSocial = removeAccents(supplier.razaoSocial.toLowerCase())
      const normalizedCode = removeAccents(supplier.code.toLowerCase())
      const normalizedCpfCnpj = supplier.cpfCnpj ? removeAccents(supplier.cpfCnpj.toLowerCase()) : ''
      return normalizedRazaoSocial.includes(normalizedSearchTerm) ||
        normalizedCode.includes(normalizedSearchTerm) ||
        (supplier.cpfCnpj && normalizedCpfCnpj.includes(normalizedSearchTerm))
    })
  }, [suppliers, searchTerm])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const finalValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/suppliers'
      const method = editingSupplier ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingSupplier ? { ...formData, id: editingSupplier.id } : formData)
      })

      if (response.ok) {
        fetchSuppliers()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar fornecedor')
      }
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      alert('Erro ao salvar fornecedor')
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      code: supplier.code,
      razaoSocial: supplier.razaoSocial,
      tipoPessoa: supplier.tipoPessoa,
      cpfCnpj: supplier.cpfCnpj,
      isActive: supplier.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchSuppliers()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir fornecedor')
      }
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      alert('Erro ao excluir fornecedor')
    }
  }

  const resetForm = () => {
    setEditingSupplier(null)
    setFormData({
      code: '',
      razaoSocial: '',
      tipoPessoa: 'FISICA',
      cpfCnpj: ''
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

      const response = await fetch('/api/suppliers/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} fornecedores importados com sucesso.`)
        fetchSuppliers()
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
    <PermissionGuard
      requiredPermissions={{
        canCreate: true,
        canEdit: true,
        canExclude: true
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <div className="lg:pl-64">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
                {/* <p className="text-gray-600">Gerencie os fornecedores da igreja</p> */}
              </div>

              <div className="flex space-x-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}
                      disabled={!canCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Fornecedor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                      </DialogTitle>
                      <DialogDescription>
                        Preencha os dados do fornecedor
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
                            placeholder="Ex: F001"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="razaoSocial" className="text-right">
                            Razão Social
                          </Label>
                          <Input
                            id="razaoSocial"
                            name="razaoSocial"
                            value={formData.razaoSocial}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                            placeholder="Nome da empresa"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="tipoPessoa" className="text-right">
                            Tipo Pessoa
                          </Label>
                          <Select
                            value={formData.tipoPessoa}
                            onValueChange={(value) => handleSelectChange('tipoPessoa', value)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FISICA">Pessoa Física</SelectItem>
                              <SelectItem value="JURIDICA">Pessoa Jurídica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="cpfCnpj" className="text-right">
                            CPF/CNPJ
                          </Label>
                          <Input
                            id="cpfCnpj"
                            name="cpfCnpj"
                            value={formData.cpfCnpj}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                            placeholder="CPF ou CNPJ"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="isActive" className="text-right">
                            Ativo
                          </Label>
                          <input
                            type="checkbox"
                            id="isActive"
                            name="isActive"
                            checked={(formData as any).isActive}
                            onChange={handleInputChange}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          {editingSupplier ? 'Atualizar' : 'Salvar'}
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
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Importar Fornecedores via CSV</DialogTitle>
                      <DialogDescription>
                        Faça upload de um arquivo CSV com os fornecedores. O arquivo deve ter as colunas: Codigo, Razão Social, Tipo Pessoa, CpfCnpj.
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
                        <p className="text-xs font-mono">Codigo, Razão Social, Tipo Pessoa, CpfCnpj</p>
                        <p className="text-xs font-mono">1,EMPRESA TESTE,J</p>
                        <p className="text-xs font-mono">2,MARIA SANTOS,F,98765432100</p>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <a
                            href="/exemplo-fornecedores.csv"
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
                placeholder="Pesquisar fornecedores por codigo, nome ou cpf/cnpj..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="max-w-md"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Fornecedores</CardTitle>
                {/* <CardDescription>Lista de fornecedores cadastrados</CardDescription> */}
                <CardDescription>
                  {filteredSuppliers.length} fornecedores encontrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Tipo Pessoa</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Badge variant="outline">{supplier.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{supplier.razaoSocial}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.tipoPessoa === 'FISICA' ? 'default' : 'secondary'}>
                            {supplier.tipoPessoa === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{supplier.cpfCnpj}</TableCell>
                        <TableCell>
                          {format(new Date(supplier.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(supplier.id)}
                              disabled={!canExclude}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
