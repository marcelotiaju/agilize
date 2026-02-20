"use client"

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
import { Plus, Edit, Trash2, List, Upload } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { SearchInput } from '@/components/ui/search-input'

export default function Classifications() {
  const { data: session } = useSession()
  const [classifications, setClassifications] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    shortCode: '',
    description: '',
    isActive: true
  })

  // Verificar permissões
  const canCreate = session?.user?.canCreate
  const canEdit = session?.user?.canEdit
  const canExclude = session?.user?.canExclude

  interface Classification {
    id: string
    code: string
    shortCode: string
    description: string
    createdAt: string
    isActive: boolean
  }

  useEffect(() => {
    fetchClassifications()
  }, [])

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

  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Filtrar classificacoes com base no termo de pesquisa
  const filteredClassifications = useMemo(() => {
    if (!searchTerm) return classifications
    const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase())

    return classifications.filter(classification => {
      const normalizedCode = removeAccents(classification.code.toLowerCase())
      const normalizedShortCode = removeAccents(classification.shortCode.toLowerCase())
      const normalizedDescription = classification.description
        ? removeAccents(classification.description.toLowerCase())
        : ''
      return normalizedCode.includes(normalizedSearchTerm) ||
        normalizedShortCode.includes(normalizedSearchTerm) ||
        (classification.description && normalizedDescription.includes(normalizedSearchTerm))
    })
  }, [classifications, searchTerm])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const finalValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/classifications'
      const method = editingClassification ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingClassification ? { ...formData, id: editingClassification.id } : formData)
      })

      if (response.ok) {
        fetchClassifications()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar classificação')
      }
    } catch (error) {
      console.error('Erro ao salvar classificação:', error)
      alert('Erro ao salvar classificação')
    }
  }

  const handleEdit = (classification: Classification) => {
    setEditingClassification(classification)
    setFormData({
      code: classification.code,
      shortCode: classification.shortCode,
      description: classification.description,
      isActive: (classification as any).isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta classificação?')) {
      try {
        const response = await fetch(`/api/classifications?id=${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          fetchClassifications()
        } else {
          const error = await response.json()
          alert(error.error || 'Erro ao excluir classificação')
        }
      } catch (error) {
        console.error('Erro ao excluir classificação:', error)
        alert('Erro ao excluir classificação')
      }
    }
  }

  const resetForm = () => {
    setEditingClassification(null)
    setFormData({
      code: '',
      shortCode: '',
      description: '',
      isActive: true
    })
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

      const response = await fetch('/api/classifications/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} classificações importadas com sucesso.`)
        fetchClassifications()
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
                <h1 className="text-2xl font-bold text-gray-900">Classificações</h1>
                {/* <p className="text-gray-600">Gerencie as classificações do sistema</p> */}
              </div>

              <div className="flex space-x-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={resetForm}
                      disabled={!canCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Classificação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingClassification ? 'Editar Classificação' : 'Nova Classificação'}
                      </DialogTitle>
                      <DialogDescription>
                        Preencha os dados da classificação
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
                            //placeholder="ex: 4.3.14"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="shortCode" className="text-right">
                            Reduzido
                          </Label>
                          <Input
                            id="shortCode"
                            name="shortCode"
                            value={formData.shortCode}
                            onChange={handleInputChange}
                            className="col-span-3"
                            //placeholder="ex: 4314"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="description" className="text-right">
                            Descrição
                          </Label>
                          <Input
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="col-span-3"
                            //placeholder="ex: LANCHES E REFEIÇÕES"
                            required
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
                            checked={(formData as any).isActive}
                            onChange={handleInputChange}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          {editingClassification ? 'Atualizar' : 'Salvar'}
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
                      <DialogTitle>Importar Classificações via CSV</DialogTitle>
                      <DialogDescription>
                        Faça upload de um arquivo CSV com as Classificações. O arquivo deve ter as colunas: Codigo, Reduzido, Descrição.
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
                        <p className="text-xs font-mono">Codigo, Reduzido, Descrição</p>
                        <p className="text-xs font-mono">4.3.14,4314,LANCHES E REFEIÇÕES</p>
                        {/* <p className="text-xs font-mono">2,MARIA SANTOS,F,98765432100</p> */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <a
                            href="/exemplo-classificacao.csv"
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
                placeholder="Pesquisar classificações por codigo, reduzido e descrição ..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="max-w-md"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Classificações Cadastradas</CardTitle>
                {/* <CardDescription>Lista de classificações do sistema</CardDescription> */}
                <CardDescription>
                  {filteredClassifications.length} classificações encontradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Reduzido</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClassifications.map((classification: Classification) => (
                      <TableRow key={classification.id}>
                        <TableCell className="font-medium">{classification.code}</TableCell>
                        <TableCell>{classification.shortCode}</TableCell>
                        <TableCell>{classification.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(classification.id)}
                              disabled={!canExclude}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(classification)}
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