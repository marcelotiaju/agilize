"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Building, Download, Trash } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs' // Adicione esta linha


interface UserData {
  id: string
  name: string
  email: string
  cpf: string
  phone?: string
  password?: string
  validFrom: string
  validTo: string
  historyDays: number
  canExport: boolean
  canDelete: boolean
  canLaunchEntry: boolean
  canLaunchTithe: boolean
  canLaunchExpense: boolean
  canApproveEntry: boolean
  canApproveTithe: boolean
  canApproveExpense: boolean
  canCreate: boolean
  canEdit: boolean
  canExclude: boolean
  defaultPage: string
  createdAt: string
  updatedAt: string
  congregations: {
    id: string
    name: string
    code: string
  }[]
}

interface Congregation {
  id: string
  code: string
  name: string
}

export default function Users() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserData[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [defaultPage, setDefaultPage] = useState(session?.user?.defaultPage || '/dashboard')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
    historyDays: 30,
    // Permissões de Sistema
    canExport: false,
    canDelete: false,
    // Permissões de Lançamento
    canLaunchEntry: false,
    canLaunchTithe: false,
    canLaunchExpense: false,
    // Permissões de Aprovação
    canApproveEntry: false,
    canApproveTithe: false,
    canApproveExpense: false,
    // Permissões de CRUD
    canCreate: false,
    canEdit: false,
    canExclude: false,
    defaultPage: '/dashboard'
  })
  const [associationData, setAssociationData] = useState({
    congregationIds: [] as string[]
  })

  useEffect(() => {

//    if (session?.user?.canCreate || session?.user?.canEdit) {
      fetchUsers()
      fetchCongregations()
 //   }
  }, [session])

  const fetchUsers = async () => {
        setIsLoading(true)
    try {
      console.log('Buscando usuários...')
      const response = await fetch('/api/users')
      console.log('Resposta da API:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Usuários carregados:', data)
        setUsers(data)
        setIsLoading(false)
      } else {
        const error = await response.json()
        console.error('Erro ao carregar usuários:', error)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      setIsLoading(false)
    }
  }

  const fetchCongregations = async () => {
    try {
      console.log('Buscando congregações...')
      const response = await fetch('/api/congregations/all')
      console.log('Resposta da API congregações:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Congregações carregadas:', data)
        setCongregations(data)
      } else {
        const error = await response.json()
        console.error('Erro ao carregar congregações:', error)
        console.error('Status da resposta:', response.status)
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingUser ? '/api/users' : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const dataToSend = { ...formData, id: editingUser?.id }
      // Apenas envie a senha se ela não estiver vazia ou se for um novo usuário
      if (!dataToSend.password) {
        delete dataToSend.password
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        //body: JSON.stringify(editingUser ? { ...formData, id: editingUser.id } : formData)
        body: JSON.stringify(dataToSend)
      })

      if (response.ok) {
        fetchUsers()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar usuário')
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      alert('Erro ao salvar usuário')
    }
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      email: user.email,
      cpf: user.cpf,
      phone: user.phone || '',
      password: '',
      validFrom: format(new Date(user.validFrom), 'yyyy-MM-dd'),
      validTo: format(new Date(user.validTo), 'yyyy-MM-dd'),
      //validTo: new Date(user.validTo).toISOString().split('T')[0],
      historyDays: user.historyDays || 30,
      // Permissões de Sistema
      canExport: user.canExport || false,
      canDelete: user.canDelete || false,
      // Permissões de Lançamento
      canLaunchEntry: user.canLaunchEntry || false,
      canLaunchTithe: user.canLaunchTithe || false,
      canLaunchExpense: user.canLaunchExpense || false,
      // Permissões de Aprovação
      canApproveEntry: user.canApproveEntry || false,
      canApproveTithe: user.canApproveTithe || false,
      canApproveExpense: user.canApproveExpense || false,
      // Permissões de CRUD
      canCreate: user.canCreate || false,
      canEdit: user.canEdit || false,
      canExclude: user.canExclude || false,
      defaultPage: user.defaultPage || '/dashboard'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir usuário')
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário')
    }
  }

const handleAssociation = (user: UserData) => {
    setSelectedUser(user)
    setAssociationData({
        congregationIds: user.congregations.map(c => c.id) // <--- Esta linha é a mais importante.
    })
    setIsAssociationDialogOpen(true)
}

  const handleAssociationSubmit = async () => {
    if (!selectedUser) return

    try {
      console.log('Enviando associação:', {
        userId: selectedUser.id,
        congregationIds: associationData.congregationIds
      })

      const response = await fetch('/api/users/associate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          congregationIds: associationData.congregationIds
        })
      })

      console.log('Resposta da API de associação:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Associação bem-sucedida:', result)
        alert(`Usuário associado com sucesso! ${result.associations} congregação(ões) associada(s).`)
        fetchUsers()
        setIsAssociationDialogOpen(false)
        setSelectedUser(null)
      } else {
        const error = await response.json()
        console.error('Erro na API:', error)
        alert(error.error || 'Erro ao associar usuário')
      }
    } catch (error) {
      console.error('Erro ao associar usuário:', error)
      alert('Erro ao associar usuário')
    }
  }

  const handleCongregationChange = (congregationId: string, checked: boolean) => {
    console.log('Mudança na congregação:', congregationId, checked)
    setAssociationData(prev => {
      const congregationIds = checked
        ? [...prev.congregationIds, congregationId]
        : prev.congregationIds.filter(id => id !== congregationId)
      
      console.log('Novas congregações selecionadas:', congregationIds)
      return { ...prev, congregationIds }
    })
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      cpf: '',
      phone: '',
      password: '',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
      historyDays: 30,
      canExport: false,
      canDelete: false,
      canLaunchEntry: false,
      canLaunchTithe: false,
      canLaunchExpense: false,
      canApproveEntry: false,
      canApproveTithe: false,
      canApproveExpense: false,
      canCreate: false,
      canEdit: false,
      canExclude: false,
      defaultPage: '/dashboard'
      
    })
  }


  if (!session?.user?.canCreate && !session?.user?.canEdit) {
    return (
    <PermissionGuard 
        requiredPermissions={{
          canCreate: true,
          canEdit: true
        }}
    >
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Acesso Negado</h2>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
              <p className="text-gray-600">Gerencie usuários e suas permissões</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados do usuário e defina as permissões
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <Tabs defaultValue="user-data" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      <TabsTrigger value="user-data">Dados do Usuário</TabsTrigger>
                      <TabsTrigger value="launch-permissions">Lançamentos</TabsTrigger>
                      <TabsTrigger value="approve-permissions">Aprovação</TabsTrigger>
                      <TabsTrigger value="crud-permissions">Cadastros</TabsTrigger>
                      <TabsTrigger value="system-permissions">Sistema</TabsTrigger>
                    </TabsList>

                    {/* Conteúdo da Aba: Dados do Usuário */}
                    <TabsContent value="user-data" className="mt-4">
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Nome</Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cpf">CPF</Label>
                            <Input
                              id="cpf"
                              name="cpf"
                              value={formData.cpf}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="password">Senha</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder={editingUser ? 'Deixe em branco para não alterar' : ''}
                            required={!editingUser}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="validFrom">Válido de</Label>
                            <Input
                              id="validFrom"
                              name="validFrom"
                              type="date"
                              value={formData.validFrom}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="validTo">Válido até</Label>
                            <Input
                              id="validTo"
                              name="validTo"
                              type="date"
                              value={formData.validTo}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="historyDays">Dias de Histórico</Label>
                          <Input
                            id="historyDays"
                            name="historyDays"
                            type="number"
                            value={formData.historyDays}
                            onChange={handleInputChange}
                            min="1"
                            max="365"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="defaultPage">Página Inicial</Label>
                          <Select
                            value={formData.defaultPage}
                            onValueChange={(value) => handleSelectChange('defaultPage', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="/dashboard">Dashboard</SelectItem>
                              <SelectItem value="/launches">Lançamentos</SelectItem>
                              <SelectItem value="/contributors">Contribuintes</SelectItem>
                              <SelectItem value="/classifications">Classificações</SelectItem>
                              <SelectItem value="/suppliers">Fornecedores</SelectItem>
                              <SelectItem value="/congregations">Congregações</SelectItem>
                              <SelectItem value="/export">Exportar Dados</SelectItem>
                              <SelectItem value="/delete-history">Excluir Histórico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Conteúdo da Aba: Lançamento */}
                    <TabsContent value="launch-permissions" className="mt-4">
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canLaunchEntry"
                              name="canLaunchEntry"
                              checked={formData.canLaunchEntry}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canLaunchEntry: checked }))
                              }
                            />
                            <Label htmlFor="canLaunchEntry">Lançar Entrada</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canLaunchTithe"
                              name="canLaunchTithe"
                              checked={formData.canLaunchTithe}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canLaunchTithe: checked }))
                              }
                            />
                            <Label htmlFor="canLaunchTithe">Lançar Dízimo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canLaunchExpense"
                              name="canLaunchExpense"
                              checked={formData.canLaunchExpense}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canLaunchExpense: checked }))
                              }
                            />
                            <Label htmlFor="canLaunchExpense">Lançar Saída</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Conteúdo da Aba: Aprovação */}
                    <TabsContent value="approve-permissions" className="mt-4">
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canApproveEntry"
                              name="canApproveEntry"
                              checked={formData.canApproveEntry}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canApproveEntry: checked }))
                              }
                            />
                            <Label htmlFor="canApproveEntry">Aprovar Entrada</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canApproveTithe"
                              name="canApproveTithe"
                              checked={formData.canApproveTithe}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canApproveTithe: checked }))
                              }
                            />
                            <Label htmlFor="canApproveTithe">Aprovar Dízimo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canApproveExpense"
                              name="canApproveExpense"
                              checked={formData.canApproveExpense}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canApproveExpense: checked }))
                              }
                            />
                            <Label htmlFor="canApproveExpense">Aprovar Saída</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Conteúdo da Aba: Cadastros (CRUD) */}
                    <TabsContent value="crud-permissions" className="mt-4">
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canCreate"
                              name="canCreate"
                              checked={formData.canCreate}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canCreate: checked }))
                              }
                            />
                            <Label htmlFor="canCreate">Incluir Registros</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canEdit"
                              name="canEdit"
                              checked={formData.canEdit}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canEdit: checked }))
                              }
                            />
                            <Label htmlFor="canEdit">Editar Registros</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canExclude"
                              name="canExclude"
                              checked={formData.canExclude}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canExclude: checked }))
                              }
                            />
                            <Label htmlFor="canExclude">Excluir Registros</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Conteúdo da Aba: Sistema */}
                    <TabsContent value="system-permissions" className="mt-4">
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canExport"
                              name="canExport"
                              checked={formData.canExport}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canExport: checked }))
                              }
                            />
                            <Label htmlFor="canExport">Permissão para exportar dados</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="canDelete"
                              name="canDelete"
                              checked={formData.canDelete}
                              onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, canDelete: checked }))
                              }
                            />
                            <Label htmlFor="canDelete">Permissão para excluir histórico</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter className="mt-6">
                    <Button type="submit">
                      {editingUser ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usuários ({users.length})</CardTitle>
              <CardDescription>Lista de usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.cpf}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>De: {format(new Date(user.validFrom), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div>Até: {format(new Date(user.validTo), 'dd/MM/yyyy', { locale: ptBR })}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssociation(user)}
                            >
                              <Building className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Associar Usuário a Congregações</DialogTitle>
            <DialogDescription>
              Selecione as congregações para o usuário <strong>{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4 py-4">
                {congregations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                        Nenhuma congregação encontrada
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                        {congregations.map((congregation) => (
                            <div key={congregation.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`congregation-${congregation.id}`}
                                    checked={associationData.congregationIds.includes(congregation.id)}
                                    onCheckedChange={(checked) => handleCongregationChange(congregation.id, checked as boolean)}
                                />
                                <Label htmlFor={`congregation-${congregation.id}`}>
                                    {congregation.code} - {congregation.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          <DialogFooter>
            <Button 
              onClick={handleAssociationSubmit}
              disabled={congregations.length === 0}
            >
              Salvar Associações ({associationData.congregationIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}