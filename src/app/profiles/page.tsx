'use client'

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
import { Plus, Edit, Trash2, Copy } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ca } from 'date-fns/locale'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Profile {
  id: string
  name: string
  description?: string
  [key: string]: any
}

export default function Profiles() {
  const { data: session } = useSession()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [profileForm, setProfileForm] = useState<any>({
    name: '',
    description: '',
    defaultLaunchType: 'DIZIMO',
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
    canLaunchCarneReviver: false,
    canApproveVote: false,
    canApproveEbd: false,
    canApproveCampaign: false,
    canApproveTithe: false,
    canApproveExpense: false,
    canApproveMission: false,
    canApproveCircle: false,
    canApproveServiceOffer: false,
    canApproveCarneReviver: false,
    canCreate: false,
    canEdit: false,
    canExclude: false,
    canListSummary: false,
    canGenerateSummary: false,
    canApproveTreasury: false,
    canApproveAccountant: false,
    canApproveDirector: false,
    canDeleteLaunch : false,
    canImportLaunch : false,
    canReportLaunches : false,
    canReportContributors: false,
    canReportSummary: false,
    canReportHistoryContribSynthetic: false,
    canReportHistoryContribAnalytic: false,
    canDeleteSummary: false,
    canTechinicalIntervention: false
  })

  useEffect(() => {
    fetchProfiles()
  }, [session])

  const fetchProfiles = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data)
      }
    } catch (e) {
      console.error('Erro ao carregar perfis', e)
    } finally {
      setIsLoading(false)
    }
  }

  const resetProfileForm = () => {
    setEditingProfile(null)
    setProfileForm({
      name: '',
      description: '',
      defaultLaunchType: 'DIZIMO',
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
      canLaunchCarneReviver: false,
      canApproveVote: false,
      canApproveEbd: false,
      canApproveCampaign: false,
      canApproveTithe: false,
      canApproveExpense: false,
      canApproveMission: false,
      canApproveCircle: false,
      canApproveServiceOffer: false,
      canApproveCarneReviver: false,
      canCreate: false,
      canEdit: false,
      canExclude: false,
      canListSummary: false,
      canGenerateSummary: false,
      canApproveTreasury: false,
      canApproveAccountant: false,
      canApproveDirector: false,
      canDeleteLaunch : false,
      canImportLaunch : false,
      canReportLaunches : false,
      canReportContributors: false,
      canReportMonthlySummary: false,
      canReportSummary: false,
      canReportHistoryContribSynthetic: false,
      canReportHistoryContribAnalytic: false,
      canDeleteSummary: false,
      canTechinicalIntervention: false
    })
  }

  const handleProfileEdit = (p: Profile) => {
    setEditingProfile(p)
    setProfileForm({ ...p })
    setIsDialogOpen(true)
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
        setIsDialogOpen(false)
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
        if (editingProfile?.id === p.id) {
          resetProfileForm()
          setIsDialogOpen(false)
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

  const canManageUsers = Boolean((session as any)?.user?.canManageUsers)

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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Perfis</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetProfileForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Perfil
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
                  <DialogDescription>Gerencie perfis e permissões</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col max-h-[72vh]">
                  <div className="overflow-y-auto p-4 space-y-4">
                    <div>
                      <Label>Nome do Perfil</Label>
                      <Input value={profileForm.name ?? ''} onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={profileForm.description ?? ''} onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultLaunchType">Tipo de Lançamento Padrão</Label>
                      <Select 
                        value={profileForm.defaultLaunchType} 
                        onValueChange={(value) => setProfileForm({...profileForm, defaultLaunchType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o padrão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DIZIMO">Dízimo</SelectItem>
                          <SelectItem value="OFERTA_CULTO">Oferta de Culto</SelectItem>
                          <SelectItem value="MISSAO">Missão</SelectItem>
                          <SelectItem value="CIRCULO">Círculo</SelectItem>
                          <SelectItem value="VOTO">Voto</SelectItem>
                          <SelectItem value="EBD">EBD</SelectItem>
                          <SelectItem value="CAMPANHA">Campanha</SelectItem>
                          <SelectItem value="CARNE_REVIVER">Carnê Reviver</SelectItem>
                          <SelectItem value="SAIDA">Saída</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <Label>Lançar Círculo de Oração</Label>
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
                            <Checkbox checked={profileForm.canLaunchCarneReviver} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchCarneReviver: v as boolean }))} />
                            <Label>Lançar Carnê Reviver</Label>
                          </div>                            
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canLaunchExpense} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canLaunchExpense: v as boolean }))} />
                            <Label>Lançar Saída</Label>
                          </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={profileForm.canDeleteLaunch} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canDeleteLaunch: v as boolean }))} />
                              <Label>Deletar Lançamento</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={profileForm.canImportLaunch} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canImportLaunch: v as boolean }))} />
                              <Label>Importar Lançamento</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={profileForm.canTechnicalIntervention} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canTechnicalIntervention: v as boolean }))} />
                              <Label>Intervenção Técnica</Label>
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
                            <Label>Aprovar Círculo de Oração</Label>
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
                            <Checkbox checked={profileForm.canApproveCarneReviver} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveCarneReviver: v as boolean }))} />
                            <Label>Aprovar Carnê Reviver</Label>
                          </div>                          
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canApproveExpense} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canApproveExpense: v as boolean }))} />
                            <Label>Aprovar Saída</Label>
                          </div>
                        </div>
                      </div>
                    </div>

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
                            <Label>Deletar Registros</Label>
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
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Resumo Diário</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canGenerateSummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canGenerateSummary: v as boolean }))} />
                            <Label>Gerar Resumo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canListSummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canListSummary: v as boolean }))} />
                            <Label>Listar Resumo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canDeleteSummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canDeleteSummary: v as boolean }))} />
                            <Label>Deletar Resumo</Label>
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

                      <div>
                        <h4 className="font-medium mb-2">Relatórios</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportLaunches} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportLaunches: v as boolean }))} />
                            <Label>Relatório de Lançamentos</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportContributors} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportContributors: v as boolean }))} />
                            <Label>Relatório de Contribuintes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportSummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportSummary: v as boolean }))} />
                            <Label>Relatório de Resumo Diário</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportMonthlySummary} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportMonthlySummary: v as boolean }))} />
                            <Label>Relatório de Resumo Mensal</Label>
                          </div>     
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportHistoryContribSynthetic} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportHistoryContribSynthetic: v as boolean }))} />
                            <Label>Histórico de Contribuições Sintético</Label>
                          </div>          
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={profileForm.canReportHistoryContribAnalytic} onCheckedChange={(v) => setProfileForm(prev => ({ ...prev, canReportHistoryContribAnalytic: v as boolean }))} />
                            <Label>Histórico de Contribuições Analítico</Label>
                          </div>                                           
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t bg-white flex justify-end gap-2">
                    <Button onClick={handleProfileSave}>{editingProfile ? 'Atualizar' : 'Criar'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Perfis ({profiles.length})</CardTitle>
              <CardDescription>Gerencie os perfis e permissões do sistema</CardDescription>
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
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleProfileEdit(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCopyProfile(p)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleProfileDelete(p)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
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
    </div>
  )
}