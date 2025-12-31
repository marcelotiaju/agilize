// 11. Página de Contribuintes (pages/contributors.tsx)
'use client'

import { useState, useEffect, useMemo, ChangeEventHandler, useRef } from 'react'
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
import { SearchInput } from '@/components/ui/search-input'

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
  },
    photoUrl: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    congregationId: '',
    code: '',
    name: '',
    cpf: '',
    ecclesiasticalPosition: '',
    tipo: 'MEMBRO',
    photoUrl: ''
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Filtrar contribuintes com base no termo de pesquisa
  const filteredContributors = useMemo(() => {
    if (!searchTerm) return contributors
    const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase())
    
    return contributors.filter(contributor => {
      const normalizedName = removeAccents(contributor.name.toLowerCase())
      const normalizedCpf = contributor.cpf ? removeAccents(contributor.cpf.toLowerCase()) : ''
      const normalizedCode = removeAccents(contributor.code.toLowerCase())
      return normalizedName.includes(normalizedSearchTerm) ||
             (contributor.cpf && normalizedCpf.includes(normalizedSearchTerm)) ||
             normalizedCode.includes(normalizedSearchTerm)
    })
  }, [contributors, searchTerm])

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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Mostrar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // Fazer upload
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/contributors/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, photoUrl: data.url }))
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao fazer upload da foto')
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload da foto')
    } finally {
      setIsUploading(false)
    }
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
      tipo: contributor.tipo || '',
      photoUrl: contributor.photoUrl || ''
    })
    setPhotoPreview(`uploads/${contributor.photoUrl}` || '')
    setIsDialogOpen(true)
  }

  const handleCancel = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contribuinte?')) {
    try {
      const response = await fetch(`/api/contributors?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchContributors()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao deletar contribuinte')
      }
    } catch (error) {
      console.error('Erro ao deletar contribuinte:', error)
      alert('Erro ao deletar contribuinte')
    }
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
      photoUrl: ''
    })
    setPhotoPreview('')
  }

  const handleFileChange = (e) => {
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
        let message = `Importação concluída! `
        if (result.updated && result.updated > 0) {
          message += `${result.updated} contribuinte(s) atualizado(s)`
        }
        if (result.created && result.created > 0) {
          if (result.updated && result.updated > 0) {
            message += ` e `
          }
          message += `${result.created} contribuinte(s) criado(s)`
        }
        if (!result.updated && !result.created) {
          message += `${result.imported} contribuinte(s) processado(s)`
        }
        message += `.`
        alert(message)
        fetchContributors()
        setIsImportDialogOpen(false)
        setCsvFile(null)
      } else {
        const error = await response.json()
        let errorMessage = error.error || 'Erro ao importar arquivo CSV'
        if (error.imported > 0) {
          errorMessage += `\n${error.imported} contribuinte(s) processado(s)`
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
              {/* <p className="text-gray-600">Gerencie os registros de contribuintes</p> */}
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

                      {/* Campo de Foto */}
                      <div className="space-y-2">
                        <Label htmlFor="photo">Foto</Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {photoPreview ? (
                              <img 
                                src={photoPreview} 
                                alt="Preview" 
                                className="h-16 w-16 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handlePhotoChange}
                              accept="image/*"
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? 'Enviando...' : 'Selecionar Foto'}
                            </Button>
                          </div>
                        </div>
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
                      Faça upload de um arquivo CSV com os contribuintes. O arquivo deve ter as colunas: Codigo,Nome,CPF,CargoEclesiastico,CodCongregação,Tipo,Foto
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
              placeholder="Pesquisar contribuintes por Codigo, nome ou CPF..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="max-w-md"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contribuintes</CardTitle>
              {/* <CardDescription>Lista de contribuintes registrados</CardDescription> */}
              <CardDescription>
                {filteredContributors.length} contribuintes encontrados
              </CardDescription>
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
                  {filteredContributors.map((contributor) => (
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