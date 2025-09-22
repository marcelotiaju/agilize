// 11. Página de Contribuintes (pages/contributors.tsx)
'use client'

import { useState, useEffect, ChangeEventHandler } from 'react'
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
import { Plus, Edit, Trash2, User, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface Contributor {
  id: string
  congregationId: string
  // date: string
  // talonNumber: string
  code: string
  name: string
  cpf?: string
  ecclesiasticalPosition?: string
  tipo?: string
  congregation: {
    id: string
    name: string
  }
}

interface Congregation {
  id: string
  code: string
  name: string
}

export default function Contributors() {
  const { data: session } = useSession()
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingContributor, setEditingContributor] = useState<Contributor | null>(null)
  const [formData, setFormData] = useState({
    congregationId: '',
    code: '',
    name: '',
    cpf: '',
    ecclesiasticalPosition: '',
    tipo: 'MEMBRO'
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  // Verificar permissões
  const canCreate = session?.user?.canCreate
  const canEdit = session?.user?.canEdit
  const canExclude = session?.user?.canExclude

  useEffect(() => {
    fetchContributors()
    fetchCongregations()
  }, [])

  const fetchContributors = async () => {
    try {
      const response = await fetch('/api/contributors')
      if (response.ok) {
        const data = await response.json()
        setContributors(data)
      }
    } catch (error) {
      console.error('Erro ao carregar contribuintes:', error)
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
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/contributors'
      const method = editingContributor ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingContributor ? { ...formData, id: editingContributor.id } : formData)
      })

      if (response.ok) {
        fetchContributors()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar contribuinte')
      }
    } catch (error) {
      console.error('Erro ao salvar contribuinte:', error)
      alert('Erro ao salvar contribuinte')
    }
  }

  const handleEdit = (contributor: Contributor) => {
    setEditingContributor(contributor)
    setFormData({
      congregationId: contributor.congregationId,
      code: contributor.code,
      name: contributor.name,
      cpf: contributor.cpf || '',
      ecclesiasticalPosition: contributor.ecclesiasticalPosition || '',
      tipo: contributor.tipo || ''
    })
    setIsDialogOpen(true)
  }

  const handleCancel = async (id: string) => {
    try {
      const response = await fetch('/api/contributors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, status: 'CANCELED' })
      })

      if (response.ok) {
        fetchContributors()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao cancelar contribuinte')
      }
    } catch (error) {
      console.error('Erro ao cancelar contribuinte:', error)
      alert('Erro ao cancelar contribuinte')
    }
  }

  const resetForm = () => {
    setEditingContributor(null)
    setFormData({
      congregationId: '',
      code: '',
      name: '',
      cpf: '',
      ecclesiasticalPosition: '',
      tipo: 'MEMBRO',
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

      const response = await fetch('/api/contributors/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} contribuintes importados com sucesso.`)
        fetchContributors()
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
              <h1 className="text-2xl font-bold text-gray-900">Contribuintes</h1>
              <p className="text-gray-600">Gerencie os registros de contribuintes</p>
            </div>
            
            <div className="flex space-x-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}
                    disabled={!canCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Contribuinte
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingContributor ? 'Editar Contribuinte' : 'Novo Contribuinte'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do contribuinte
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="congregationId" className="text-right">
                          Congregação
                        </Label>
                        <Select
                          value={formData.congregationId}
                          onValueChange={(value) => handleSelectChange('congregationId', value)}
                        >
                          <SelectTrigger className="col-span-3">
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
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="talonNumber" className="text-right">
                          Código
                        </Label>
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          className="col-span-3"
                          required
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
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cpf" className="text-right">
                          CPF
                        </Label>
                        <Input
                          id="cpf"
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          className="col-span-3"
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ecclesiasticalPosition" className="text-right">
                          Cargo Eclesiástico
                        </Label>
                        <Input
                          id="ecclesiasticalPosition"
                          name="ecclesiasticalPosition"
                          value={formData.ecclesiasticalPosition}
                          onChange={handleInputChange}
                          className="col-span-3"
                          placeholder="Ex: Pastor, Diácono, etc."
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tipo">Tipo</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(value) => handleSelectChange('tipo', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONGREGADO">Congregado</SelectItem>
                            <SelectItem value="MEMBRO">Membro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingContributor ? 'Atualizar' : 'Salvar'}
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
                    <DialogTitle>Importar Contribuintes via CSV</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo CSV com os contribuintes. O arquivo deve ter as colunas: congregação, nome, cpf, cargo_eclesiástico.
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
                      <p className="text-xs font-mono">codigo,nome,cpf,cargo_eclesiástico,congregação,tipo</p>
                      <p className="text-xs font-mono">CG001,João Silva,12345678901,Pastor,1,Congregado</p>
                      <p className="text-xs font-mono">CG002,Maria Santos,98765432100,Diácono,2,Membro</p>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a 
                          href="/exemplo-contribuintes.csv" 
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

          <Card>
            <CardHeader>
              <CardTitle>Contribuintes</CardTitle>
              <CardDescription>Lista de contribuintes registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cargo Eclesiástico</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributors.map((contributor) => (
                    <TableRow key={contributor.id}>
                      <TableCell>{contributor.code}</TableCell>
                      <TableCell>{contributor.name}</TableCell>
                      <TableCell>{contributor.cpf || '-'}</TableCell>
                      <TableCell>{contributor.ecclesiasticalPosition || '-'}</TableCell>
                      <TableCell>{contributor.tipo || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(contributor)}
                            disabled={!canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(contributor.id)}
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
    </PermissionGuard>
  )
}