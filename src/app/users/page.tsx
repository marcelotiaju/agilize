"use client"

import { useState, useEffect, useMemo } from 'react'
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
import { Plus, Edit, Trash2, Building, Upload, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchInput } from '@/components/ui/search-input'

interface UserData {
  id: string
  login?: string | null
  name: string
  email: string
  phone?: string
  password?: string
  validFrom: string
  validTo: string
  historyDays: number
  defaultPage: string
  createdAt: string
  updatedAt: string
  congregations: {
    id: string
    name: string
    code: string
  }[]
  profile?: {
    id: string
    name: string
    // permissões centralizadas estarão disponíveis via backend (consumir user.profile.* quando necessário)
    [key: string]: any
  } | null
}

interface Congregation {
  id: string
  code: string
  name: string
}

interface Profile {
  id: string
  name: string
  description?: string
  // permissões podem vir do backend; tipo parcial para render
  [key: string]: any
}

export default function Users() {
  const { data: session } = useSession()

  // estados e hooks devem ser declarados sempre (sem retornos antecipados)
  const [users, setUsers] = useState<UserData[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [defaultPage, setDefaultPage] = useState(session?.user?.defaultPage || '/dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [ImportingAssociate, setImportingAssociate] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImportAssDialogOpen, setIsImportAssDialogOpen] = useState(false)

  // user form: removed individual permission toggles (now managed by Profile)
  const [formData, setFormData] = useState({
    login: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
    historyDays: 30,
    profileId: '',
    defaultPage: '/dashboard'
  })
  const [associationData, setAssociationData] = useState({
    congregationIds: [] as string[]
  })

  // Profile dialog & form
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [profileForm, setProfileForm] = useState<any>({
    name: '',
    description: '',
    canExport: false,
    canDelete: false,
    canLaunchVote: false,
    canLaunchEbd: false,
    canLaunchCampaign: false,
    canLaunchTithe: false,
    canLaunchExpense: false,
    canLaunchMission: false,
    canLaunchCircle: false,
    canLaunchServiceOffer: false,
    canApproveVote: false,
    canApproveEbd: false,
    canApproveCampaign: false,
    canApproveTithe: false,
    canApproveExpense: false,
    canApproveMission: false,
    canApproveCircle: false,
    canApproveServiceOffer: false,
    canCreate: false,
    canEdit: false,
    canExclude: false,
    canManageSummary: false,
    canApproveTreasury: false,
    canApproveAccountant: false,
    canApproveDirector: false
  })

  useEffect(() => {
    fetchUsers()
    fetchCongregations()
    fetchProfiles()
  }, [session])

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data)
      }
    } catch (e) {
      console.error('Erro ao carregar perfis', e)
    }
  }

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        console.error('Erro ao buscar usuários:', await response.text())
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      const dataToSend: any = { ...formData, id: editingUser?.id }
      if (!dataToSend.password) delete dataToSend.password
      // permissions are managed via profile; legacy flags not sent here
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (res.ok) {
        fetchUsers()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await res.json()
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
      login: user.login || '',
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      password: '',
      validFrom: format(new Date(user.validFrom), 'yyyy-MM-dd'),
      validTo: format(new Date(user.validTo), 'yyyy-MM-dd'),
      historyDays: user.historyDays || 30,
      profileId: user.profile?.id || '',
      defaultPage: user.defaultPage || '/dashboard'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      const response = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchUsers()
      else {
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
    setAssociationData({ congregationIds: user.congregations.map(c => c.id) })
    setIsAssociationDialogOpen(true)
  }

  const handleSelectAll = (checked: boolean) => {
    setAssociationData(prev => {
      const allCongregationIds = checked ? congregations.map(c => c.id) : []
      return { ...prev, congregationIds: allCongregationIds }
    })
  }

  const handleAssociationSubmit = async () => {
    if (!selectedUser) return
    try {
      const response = await fetch('/api/users/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, congregationIds: associationData.congregationIds })
      })
      if (response.ok) {
        const result = await response.json()
        alert(`Usuário associado com sucesso! ${result.associations} congregação(ões) associada(s).`)
        fetchUsers()
        setIsAssociationDialogOpen(false)
        setSelectedUser(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao associar usuário')
      }
    } catch (error) {
      console.error('Erro ao associar usuário:', error)
      alert('Erro ao associar usuário')
    }
  }

  const handleCongregationChange = (congregationId: string, checked: boolean) => {
    setAssociationData(prev => {
      const congregationIds = checked ? [...prev.congregationIds, congregationId] : prev.congregationIds.filter(id => id !== congregationId)
      return { ...prev, congregationIds }
    })
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      login: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
      historyDays: 30,
      profileId: '',
      defaultPage: '/dashboard'
    })
  }

  // CSV handlers (unchanged)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') setCsvFile(file)
    else { alert('Por favor, selecione um arquivo CSV válido'); e.target.value = '' }
  }

  const handleImportCSV = async () => {
    if (!csvFile) { alert('Por favor, selecione um arquivo CSV'); return }
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', csvFile)
      const response = await fetch('/api/users/import', { method: 'POST', body: form })
      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} usuários importados com sucesso.`)
        fetchUsers()
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

  const handleImportAssociateCSV = async () => {
    if (!csvFile) { alert('Por favor, selecione um arquivo CSV'); return }
    setImportingAssociate(true)
    try {
      const form = new FormData()
      form.append('file', csvFile)
      const response = await fetch('/api/users/importAssociate', { method: 'POST', body: form })
      if (response.ok) {
        const result = await response.json()
        alert(`Importação concluída! ${result.imported} usuários associados com sucesso.`)
        fetchUsers()
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
      setImportingAssociate(false)
    }
  }

  // Profiles CRUD UI handlers
  const resetProfileForm = () => {
    setEditingProfile(null)
    setProfileForm({
      name: '',
      description: '',
      canExport: false,
      canDelete: false,
      canLaunchVote: false,
      canLaunchEbd: false,
      canLaunchCampaign: false,
      canLaunchTithe: false,
      canLaunchExpense: false,
      canLaunchMission: false,
      canLaunchCircle: false,
      canLaunchServiceOffer: false,
      canApproveVote: false,
      canApproveEbd: false,
      canApproveCampaign: false,
      canApproveTithe: false,
      canApproveExpense: false,
      canApproveMission: false,
      canApproveCircle: false,
      canApproveServiceOffer: false,
      canCreate: false,
      canEdit: false,
      canExclude: false,
      canManageSummary: false,
      canApproveTreasury: false,
      canApproveAccountant: false,
      canApproveDirector: false
    })
  }

  const handleProfileEdit = (p: Profile) => {
    setEditingProfile(p)
    setProfileForm({ ...p })
    setIsProfileDialogOpen(true)
  }

  const handleProfileSave = async () => {
    try {
      const method = editingProfile ? 'PUT' : 'POST'
      const url = '/api/profiles'
      const body = editingProfile ? { ...profileForm, id: editingProfile.id } : profileForm
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        fetchProfiles()
        resetProfileForm()
        setIsProfileDialogOpen(false)
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar perfil')
      }
    } catch (e) { console.error(e); alert('Erro ao salvar perfil') }
  }

  const handleCopyProfile = async (p: Profile) => {
    try {
      const copy = { ...p, name: `${p.name} - cópia` }
      delete (copy as any).id
      const res = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy) })
      if (res.ok) {
        fetchProfiles()
        alert('Perfil copiado')
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao copiar perfil')
      }
    } catch (e) { console.error(e); alert('Erro ao copiar perfil') }
  }

  const handleProfileDelete = async (p: Profile) => {
    if (!confirm(`Deseja excluir o perfil "${p.name}"? Esta ação é irreversível.`)) return
    try {
      const res = await fetch(`/api/profiles?id=${p.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProfiles()
        // se estivermos editando o mesmo perfil, fechar/resetar
        if (editingProfile?.id === p.id) {
          resetProfileForm()
          setIsProfileDialogOpen(false)
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao excluir perfil')
      }
    } catch (e) {
      console.error('Erro ao excluir perfil', e)
      alert('Erro ao excluir perfil')
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [users, searchTerm])

  // mapping labels to display profile permissions
  const permissionLabels: [keyof Profile, string][] = [
    ['canLaunchVote', 'Lançar Votos'],
    ['canLaunchEbd', 'Lançar EBD'],
    ['canLaunchCampaign', 'Lançar Campanha'],
    ['canLaunchTithe', 'Lançar Dízimo'],
    ['canLaunchExpense', 'Lançar Saída'],
    ['canLaunchMission', 'Lançar Missão'],
    ['canLaunchCircle', 'Lançar Círculo'],
    ['canLaunchServiceOffer', 'Lançar Oferta do Culto'],
    ['canApproveVote', 'Aprovar Votos'],
    ['canApproveEbd', 'Aprovar EBD'],
    ['canApproveCampaign', 'Aprovar Campanha'],
    ['canApproveTithe', 'Aprovar Dízimo'],
    ['canApproveExpense', 'Aprovar Saída'],
    ['canApproveMission', 'Aprovar Missão'],
    ['canApproveCircle', 'Aprovar Círculo'],
    ['canApproveServiceOffer', 'Aprovar Oferta do Culto'],
    ['canCreate', 'Incluir Registros'],
    ['canEdit', 'Editar Registros'],
    ['canExclude', 'Excluir Registros'],
    ['canExport', 'Exportar Dados'],
    ['canDelete', 'Excluir Histórico'],
    ['canManageSummary', 'Gerenciar Resumo'],
    ['canApproveTreasury', 'Aprovar Tesoureiro'],
    ['canApproveAccountant', 'Aprovar Contador'],
    ['canApproveDirector', 'Aprovar Dirigente'],
  ]

  // só depois de declarar os hooks podemos checar permissões e possivelmente retornar
  const canManageUsers = Boolean((session as any)?.user?.canManageUsers)
  console.log('canManageUsers', canManageUsers)
  if (!canManageUsers) {
    return (
      <PermissionGuard requiredPermissions={{ canCreate: true, canEdit: true }}>
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
            </div>
            <div className="flex space-x-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px]">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                    <DialogDescription>Preencha os dados do usuário. Permissões são definidas via Perfil.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                         <Label htmlFor="name">Nome Completo</Label>
                         <Input id="name" name="name" value={formData.name ?? ''} onChange={handleInputChange} placeholder="Nome completo do usuário" required />
                       </div>
                        <div>
                          <Label htmlFor="login">Login</Label>
                          <Input id="login" name="login" value={(formData as any).login ?? ''} onChange={handleInputChange} placeholder="Qualquer texto para login" />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" value={formData.email ?? ''} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input id="phone" name="phone" value={formData.phone ?? ''} onChange={handleInputChange} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" name="password" type="password" value={formData.password ?? ''} onChange={handleInputChange} placeholder={editingUser ? 'Deixe em branco para não alterar' : ''} required={!editingUser} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="validFrom">Válido de</Label>
                          <Input id="validFrom" name="validFrom" type="date" value={formData.validFrom ?? ''} onChange={handleInputChange} required />
                        </div>
                        <div>
                          <Label htmlFor="validTo">Válido até</Label>
                          <Input id="validTo" name="validTo" type="date" value={formData.validTo ?? ''} onChange={handleInputChange} required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="historyDays">Dias de Histórico</Label>
                          <Input id="historyDays" name="historyDays" type="number" value={(formData as any).historyDays ?? ''} onChange={handleInputChange} min="1" max="365" required />
                        </div>
                        <div>
                          <Label htmlFor="profileId">Perfil</Label>
                          <div className="flex items-center space-x-2">
                            <Select value={(formData as any).profileId} onValueChange={(v) => handleSelectChange('profileId', v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value=" ">-- Sem Perfil --</SelectItem>
                                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" onClick={() => { setIsProfileDialogOpen(true); resetProfileForm() }}><Edit className="h-4 w-4" /></Button>
                          </div>

                          {/* mostrar resumo de permissões do perfil selecionado (apenas leitura) */}
                          {/* {(formData as any).profileId && (() => {
                            const prof = profiles.find(p => p.id === (formData as any).profileId) as Profile | undefined
                            if (!prof) return null
                            return (
                              <div className="mt-2 p-2 bg-gray-50 border rounded text-sm">
                                <div className="font-medium mb-1">Permissões do perfil "{prof.name}":</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {permissionLabels.map(([key, label]) => {
                                    if ((prof as any)[key]) {
                                      return <div key={key} className="text-xs text-gray-700">• {label}</div>
                                    }
                                    return null
                                  })}
                                  {permissionLabels.every(([k]) => !(prof as any)[k]) && <div className="text-xs text-gray-500 col-span-2">Nenhuma permissão atribuída</div>}
                                </div>
                              </div>
                            )
                          })()} */}
                        </div>
                      </div>
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
                          <SelectItem value="/congregation-summary">Resumo Diario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <DialogFooter className="mt-6">
                      <Button type="submit">
                        {editingUser ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { setCsvFile(null); }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Importar Usuários via CSV</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="csvFile" className="text-right">Arquivo CSV</Label>
                      <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} className="col-span-3" required />
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      <p className="font-medium mb-2">Formato esperado do CSV:</p>
                      <p className="text-xs font-mono">nome,email,cpf,dias_historico,telefone,validade_inicio,validade_fim,...</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={handleImportCSV} disabled={!csvFile || importing}>{importing ? 'Importando...' : 'Importar'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isImportAssDialogOpen} onOpenChange={setIsImportAssDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { setCsvFile(null); }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Associação
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Importar Associação via CSV</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="csvFile" className="text-right">Arquivo CSV</Label>
                      <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} className="col-span-3" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={handleImportAssociateCSV} disabled={!csvFile || importing}>{importing ? 'Importando...' : 'Importar'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
          </div>

          <div className="mb-6">
            <SearchInput placeholder="Pesquisar usuários por nome ou e-mail..." value={searchTerm} onChange={setSearchTerm} className="max-w-md" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usuários ({users.length})</CardTitle>
              <CardDescription>{filteredUsers.length} usuários encontrados</CardDescription>
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
                      <TableHead>Nome Completo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>De: {format(new Date(user.validFrom), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div>Até: {format(new Date(user.validTo), 'dd/MM/yyyy', { locale: ptBR })}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(user)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleAssociation(user)}><Building className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Associar Usuário a Congregações</DialogTitle>
                <DialogDescription>Selecione as congregações para o usuário <strong>{selectedUser?.name}</strong></DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {congregations.length > 0 && (
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox id="selectAllCongregations" checked={associationData.congregationIds.length === congregations.length && congregations.length > 0} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} />
                    <Label htmlFor="selectAllCongregations" className="font-semibold cursor-pointer">Marcar/Desmarcar Todas ({associationData.congregationIds.length}/{congregations.length})</Label>
                  </div>
                )}

                {congregations.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Nenhuma congregação encontrada</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {congregations.map((congregation) => (
                      <div key={congregation.id} className="flex items-center space-x-2">
                        <Checkbox id={`congregation-${congregation.id}`} checked={associationData.congregationIds.includes(congregation.id)} onCheckedChange={(checked) => handleCongregationChange(congregation.id, checked as boolean)} />
                        <Label htmlFor={`congregation-${congregation.id}`}>{congregation.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleAssociationSubmit} disabled={congregations.length === 0}>Salvar Associações ({associationData.congregationIds.length})</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile management dialog */}
          <Dialog open={isProfileDialogOpen} onOpenChange={(v) => { setIsProfileDialogOpen(v); if (!v) resetProfileForm() }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
                <DialogDescription>Gerencie perfis e permissões</DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col max-h-[72vh]">
                {/* Área rolável com todo o formulário */}
                <div className="overflow-y-auto p-4 space-y-4">
                  <div>
                    <Label>Nome do Perfil</Label>
                    <Input value={profileForm.name ?? ''} onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={profileForm.description ?? ''} onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Lançamentos</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchTithe} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchTithe: v as boolean }))} />
                          <Label>Lançar Dízimo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchServiceOffer} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchServiceOffer: v as boolean }))} />
                          <Label>Lançar Oferta do Culto</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchMission} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchMission: v as boolean }))} />
                          <Label>Lançar Missão</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchCircle} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchCircle: v as boolean }))} />
                          <Label>Lançar Círculo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchVote} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchVote: v as boolean }))} />
                          <Label>Lançar Votos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchEbd} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchEbd: v as boolean }))} />
                          <Label>Lançar EBD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchCampaign} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchCampaign: v as boolean }))} />
                          <Label>Lançar Campanha</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canLaunchExpense} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchExpense: v as boolean }))} />
                          <Label>Lançar Saída</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Aprovação</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveTithe} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveTithe: v as boolean }))} />
                          <Label>Aprovar Dízimo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveServiceOffer} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveServiceOffer: v as boolean }))} />
                          <Label>Aprovar Oferta do Culto</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveMission} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveMission: v as boolean }))} />
                          <Label>Aprovar Missão</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveCircle} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveCircle: v as boolean }))} />
                          <Label>Aprovar Círculo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveVote} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveVote: v as boolean }))} />
                          <Label>Aprovar Votos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveEbd} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveEbd: v as boolean }))} />
                          <Label>Aprovar EBD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveCampaign} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveCampaign: v as boolean }))} />
                          <Label>Aprovar Campanha</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveExpense} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveExpense: v as boolean }))} />
                          <Label>Aprovar Saída</Label>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canManageSummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canManageSummary: v as boolean }))} />
                            <Label>Gerenciar Resumo</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cadastros e Sistema */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Cadastros (CRUD)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canCreate} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canCreate: v as boolean }))} />
                          <Label>Incluir Registros</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canEdit} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canEdit: v as boolean }))} />
                          <Label>Editar Registros</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canExclude} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canExclude: v as boolean }))} />
                          <Label>Excluir Registros</Label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Sistema / Outras</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canExport} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canExport: v as boolean }))} />
                          <Label>Exportar Dados</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canDelete} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canDelete: v as boolean }))} />
                          <Label>Excluir Histórico</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveTreasury} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveTreasury: v as boolean }))} />
                          <Label>Aprovar como Tesoureiro</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveAccountant} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveAccountant: v as boolean }))} />
                          <Label>Aprovar como Contador</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={profileForm.canApproveDirector} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveDirector: v as boolean }))} />
                          <Label>Aprovar como Dirigente</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* <div className="mt-4">
                    <h5 className="font-medium">Perfis Existentes</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profiles.map(p => (
                        <div key={p.id} className="flex items-center justify-between border p-2 rounded">
                          <div>{p.name}</div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => handleProfileEdit(p)}><Edit className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>*/}
             


                {/* Footer fixo com ações */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {profiles.map(p => (
                      <div key={p.id} className="flex items-center justify-between border p-2 rounded">
                        <div>{p.name}</div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => handleProfileEdit(p)} title="Editar perfil">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCopyProfile(p)} title="Copiar perfil">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleProfileDelete(p)} title="Excluir perfil">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


              <div className="p-4 border-t bg-white flex justify-end gap-2">
                  <div className="flex gap-2">
                    <Button onClick={handleProfileSave}>{editingProfile ? 'Atualizar' : 'Criar'}</Button>
                    {/* {editingProfile && <Button variant="outline" onClick={() => handleCopyProfile(editingProfile)}>Copiar Perfil</Button>} */}
                  </div>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}