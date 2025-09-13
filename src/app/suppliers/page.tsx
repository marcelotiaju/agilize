'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    razaoSocial: '',
    tipoPessoa: '',
    cpfCnpj: ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
      cpfCnpj: supplier.cpfCnpj
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
      tipoPessoa: '',
      cpfCnpj: ''
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
              <p className="text-gray-600">Gerencie os fornecedores da igreja</p>
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
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingSupplier ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>Lista de fornecedores cadastrados</CardDescription>
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
                  {suppliers.map((supplier) => (
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
                            onClick={() => handleEdit(supplier)}
                            disabled={!canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
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
