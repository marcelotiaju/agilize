"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, List } from 'lucide-react'

export default function Classifications() {
  const { data: session } = useSession()
  const [classifications, setClassifications] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    shortCode: '',
    description: ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
      description: classification.description
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
      description: ''
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Classificações</h1>
              <p className="text-gray-600">Gerencie as classificações do sistema</p>
            </div>
            
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
                        placeholder="ex: 4.3.14"
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
                        placeholder="ex: 4314"
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
                        placeholder="ex: LANCHES E REFEIÇÕES"
                        required
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Classificações Cadastradas</CardTitle>
              <CardDescription>Lista de classificações do sistema</CardDescription>
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
                  {classifications.map((classification: Classification) => (
                    <TableRow key={classification.id}>
                      <TableCell className="font-medium">{classification.code}</TableCell>
                      <TableCell>{classification.shortCode}</TableCell>
                      <TableCell>{classification.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(classification)}
                            disabled={!canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(classification.id)}
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