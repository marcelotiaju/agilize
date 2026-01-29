// 13. Página de Exclusão de Histórico (pages/delete-history.tsx)
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface Congregation {
  id: string
  code: string
  name: string
}

interface DeleteResult {
  message: string
  deletedLaunches?: number
  deletedContributors?: number
}

export default function DeleteHistory() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [formData, setFormData] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    type: ['DIZIMO', 'OFERTA_CULTO', 'MISSAO', 'CIRCULO', 'VOTO', 'EBD', 'CAMPANHA', 'SAIDA'],
    congregationIds: [] as string[]
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null)

  useEffect(() => {
    fetchCongregations()
  }, [])

  const fetchCongregations = async () => {
    try {
      const response = await fetch('/api/congregations')
      if (response.ok) {
        const data = await response.json()
        setCongregations(data)

        // Selecionar todas as congregações por padrão
        setFormData(prev => ({
          ...prev,
          congregationIds: data.map((c: Congregation) => c.id)
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => {
      const types = checked
        ? [...prev.type, type]
        : prev.type.filter(t => t !== type)

      return { ...prev, type: types }
    })
  }

  const handleCongregationChange = (congregationId: string, checked: boolean) => {
    setFormData(prev => {
      const congregationIds = checked
        ? [...prev.congregationIds, congregationId]
        : prev.congregationIds.filter(id => id !== congregationId)

      return { ...prev, congregationIds }
    })
  }

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      congregationIds: checked ? congregations.map(c => c.id) : []
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (formData.congregationIds.length === 0) {
      alert('Selecione pelo menos uma congregação')
      return
    }

    setIsConfirmDialogOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    setIsConfirmDialogOpen(false)

    try {
      const response = await fetch('/api/delete-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        setDeleteResult(result)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir histórico')
      }
    } catch (error) {
      console.error('Erro ao excluir histórico:', error)
      alert('Erro ao excluir histórico')
    } finally {
      setIsDeleting(false)
    }
  }

  const allSelected = congregations.length > 0 && formData.congregationIds.length === congregations.length

  return (
    <PermissionGuard
      requiredPermissions={{
        canDelete: true
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <div className="lg:pl-64">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Excluir Histórico</h1>
              {/* <p className="text-gray-600">Exclua permanentemente lançamentos</p> */}
            </div>

            {deleteResult && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Operação Concluída</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-700">
                    {deleteResult.message}
                  </p>
                  {deleteResult.deletedLaunches !== undefined && (
                    <p className="text-green-700">
                      Lançamentos excluídos: {deleteResult.deletedLaunches}
                    </p>
                  )}
                  {deleteResult.deletedContributors !== undefined && (
                    <p className="text-green-700">
                      Contribuintes excluídos: {deleteResult.deletedContributors}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <Trash2 className="mr-2 h-5 w-5" />
                      Configurar Exclusão
                    </CardTitle>
                    <CardDescription>
                      Selecione o período e os dados que deseja excluir permanentemente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Data Inicial</Label>
                          <Input
                            id="startDate"
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">Data Final</Label>
                          <Input
                            id="endDate"
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className='mb-2 block'>Tipo de Dados</Label>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-dizimo"
                                checked={formData.type.includes('DIZIMO')}
                                onCheckedChange={(checked) => handleTypeChange('DIZIMO', checked as boolean)}
                              />
                              <Label htmlFor="type-dizimo" className="text-sm">Dízimos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-oferta"
                                checked={formData.type.includes('OFERTA_CULTO')}
                                onCheckedChange={(checked) => handleTypeChange('OFERTA_CULTO', checked as boolean)}
                              />
                              <Label htmlFor="type-oferta" className="text-sm">Oferta Culto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-missao"
                                checked={formData.type.includes('MISSAO')}
                                onCheckedChange={(checked) => handleTypeChange('MISSAO', checked as boolean)}
                              />
                              <Label htmlFor="type-missao" className="text-sm">Missão</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-circulo"
                                checked={formData.type.includes('CIRCULO')}
                                onCheckedChange={(checked) => handleTypeChange('CIRCULO', checked as boolean)}
                              />
                              <Label htmlFor="type-circulo" className="text-sm">Círculo Oração</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-voto"
                                checked={formData.type.includes('VOTO')}
                                onCheckedChange={(checked) => handleTypeChange('VOTO', checked as boolean)}
                              />
                              <Label htmlFor="type-votos" className="text-sm">Voto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-ebd"
                                checked={formData.type.includes('EBD')}
                                onCheckedChange={(checked) => handleTypeChange('EBD', checked as boolean)}
                              />
                              <Label htmlFor="type-ebd" className="text-sm">EBD</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-campanha"
                                checked={formData.type.includes('CAMPANHA')}
                                onCheckedChange={(checked) => handleTypeChange('CAMPANHA', checked as boolean)}
                              />
                              <Label htmlFor="type-campanha" className="text-sm">Campanha</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="type-saida"
                                checked={formData.type.includes('SAIDA')}
                                onCheckedChange={(checked) => handleTypeChange('SAIDA', checked as boolean)}
                              />
                              <Label htmlFor="type-saida" className="text-sm">Saídas</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="selectAll"
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="selectAll">Selecionar todas as congregações</Label>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                          {congregations.map((congregation) => (
                            <div key={congregation.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`congregation-${congregation.id}`}
                                checked={formData.congregationIds.includes(congregation.id)}
                                onCheckedChange={(checked) => handleCongregationChange(congregation.id, checked as boolean)}
                              />
                              <Label htmlFor={`congregation-${congregation.id}`}>
                                {congregation.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Histórico
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Aviso Importante
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Ação Irreversível</h4>
                    <p className="text-sm text-gray-600">
                      Esta ação não pode ser desfeita. Os dados serão permanentemente excluídos do sistema.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Permissões</h4>
                    <p className="text-sm text-gray-600">
                      Apenas usuários com permissão de exclusão podem realizar esta operação.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Recomendações</h4>
                    <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                      <li>Exporte os dados antes de excluí-los</li>
                      <li>Verifique cuidadosamente o período selecionado</li>
                      <li>Certifique-se de que outras pessoas não precisam desses dados</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <Shield className="mr-2 h-5 w-5" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Todas as ações de exclusão são registradas em log para auditoria e rastreabilidade.
                  </p>
                </CardContent>
              </Card>
            </div> */}
            </div>
          </div>
        </div>

        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription>
                Esta ação é irreversível e excluirá permanentemente todos os dados selecionados.
                Tem certeza de que deseja continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}