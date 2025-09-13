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
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'

export default function Launches() {
  const { data: session } = useSession()
  const [launches, setLaunches] = useState<Launch[]>([])
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tipos
  type Congregation = { id: string; name: string }
  type Contributor = { id: string; name: string; }
  type Supplier = { id: string; razaoSocial: string }
  type Classification = { id: string; description: string }

  type Launch = {
    id: string
    congregationId: string
    type: string
    date: string
    talonNumber?: string
    offerValue?: number
    votesValue?: number
    ebdValue?: number
    value?: number
    description?: string
    status?: string
    exported?: boolean
    congregation?: { id: string; name: string }
    contributorId?: number
    contributor?: { id: string; name: string }
    contributorName?: string
    supplierId?: number
    supplier?: { id: string; razaoSocial: string }
    supplierName?: string
    classificationId?: string
    classification?: { id: string; name: string }
    approved?: boolean
  }

  // Permissões
  const canLaunchEntry = session?.user?.canLaunchEntry
  const canLaunchTithe = session?.user?.canLaunchTithe
  const canLaunchExpense = session?.user?.canLaunchExpense
  const canApproveEntry = session?.user?.canApproveEntry
  const canApproveTithe = session?.user?.canApproveTithe
  const canApproveExpense = session?.user?.canApproveExpense
  const canEdit = session?.user?.canEdit

  const [editingLaunch, setEditingLaunch] = useState<Launch | null>(null)
  const [formData, setFormData] = useState({
    congregationId: '',
    type: 'ENTRADA',
    date: format(new Date(), 'yyyy-MM-dd'),
    talonNumber: '',
    offerValue: '',
    votesValue: '',
    ebdValue: '',
    value: '',
    description: '',
    contributorId: null,
    contributorName: '',
    isContributorRegistered: true,
    supplierId: '',
    supplierName: '',
    isSupplierRegistered: true,
    classificationId: '' // Novo campo
  })

  useEffect(() => {
    fetchLaunches()
    fetchCongregations()
    fetchContributors()
    fetchSuppliers()
    fetchClassifications()
  }, [])

  useEffect(() => {
    // Se houver apenas uma congregação, definir como default
    if (congregations.length === 1) {
      setFormData(prev => ({
        ...prev,
        congregationId: congregations[0].id
      }))
    }
  }, [congregations])

  const fetchLaunches = async () => {
    try {
      const response = await fetch('/api/launches')
      if (response.ok) {
        const data = await response.json()
        setLaunches(data)
      }
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
      setError('Erro ao carregar lançamentos. Tente novamente.')
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
      setError('Erro ao carregar congregações.')
    }
  }

  const fetchContributors = async () => {
    try {
      const response = await fetch('/api/contributors')
      if (response.ok) {
        const data = await response.json()
        setContributors(data)
      }
    } catch (error) {
      console.error('Erro ao carregar contribuintes:', error)
      setError('Erro ao carregar contribuintes.')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
      setError('Erro ao carregar fornecedores.')
    }
  }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))

  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

        // --- Início da validação de valor ---
        const values = {
          offerValue: parseFloat(formData.offerValue),
          votesValue: parseFloat(formData.votesValue),
          ebdValue: parseFloat(formData.ebdValue),
          value: parseFloat(formData.value),
        }
    
        if (formData.type === 'ENTRADA') {
          if (!values.offerValue && !values.votesValue && !values.ebdValue) {
            setError('Pelo menos um dos campos de valor (Oferta, Voto, EBD) deve ser preenchido para Entradas.')
            return
          }
        } else if (formData.type === 'DIZIMO' || formData.type === 'SAIDA') {
          if (!values.value) {
            setError(`O campo Valor deve ser preenchido para ${formData.type === 'DIZIMO' ? 'Dízimos' : 'Saídas'}.`)
            return
          }
        }

        try {
          const url = editingLaunch ? `/api/launches/${editingLaunch.id}` : '/api/launches' // A API já trata a atualização pelo corpo da requisição
          const method = editingLaunch ? 'PUT' : 'POST';
          
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          })

          console.log(response)
    
          if (response.ok) {
            fetchLaunches()
            setIsDialogOpen(false)
            resetForm()
          } else {
            const error = await response.json()
            alert(error.error || 'Erro ao salvar lançamento')
          }
        } catch (error) {
          console.error('Erro ao salvar lançamento:', error)
          alert('Erro ao salvar lançamento')
        }
      }

  const handleEdit = (launch: Launch) => {
    setEditingLaunch(launch)
    setFormData({
      congregationId: launch.congregationId,
      type: launch.type,
      date: format(new Date(launch.date), 'yyyy-MM-dd'),
      talonNumber: launch.talonNumber || '',
      offerValue: launch.offerValue?.toString() || '',
      votesValue: launch.votesValue?.toString() || '',
      ebdValue: launch.ebdValue?.toString() || '',
      value: launch.value?.toString() || '',
      description: launch.description || '',
      contributorId: launch.contributorId?.toString() || '',
      contributorName: launch.contributorName || '',
      isContributorRegistered: !!launch.contributorId,
      supplierId: launch.supplierId?.toString() || '',
      supplierName: launch.supplierName || '',
      isSupplierRegistered: !!launch.supplierId,
      classificationId: launch.classificationId || ''
    })
    setIsDialogOpen(true)
  }

  const handleCancel = async (id: string) => {
    setError(null)
    try {
      const response = await fetch(`api/launches/status/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'CANCELED' }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao cancelar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao cancelar lançamento:', error)
      setError('Erro ao cancelar lançamento. Tente novamente.')
    }
  }

  const handleApprove = async (id: string) => {
    setError(null)
    try {
      const response = await fetch(`/api/launches/status/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, approved: true }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao aprovar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao aprovar lançamento:', error)
      setError('Erro ao aprovar lançamento. Tente novamente.')
    }
  }

  const handleReprove = async (id: string) => {
    setError(null)
    try {
      const response = await fetch(`/api/launches/status/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, approved: false }),
      })

      if (response.ok) {
        fetchLaunches()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao reprovar lançamento.')
      }
    } catch (error) {
      console.error('Erro ao reprovar lançamento:', error)
      setError('Erro ao reprovar lançamento. Tente novamente.')
    }
  }

  const resetForm = () => {
    setEditingLaunch(null)
    setFormData({
      congregationId: '',
      type: 'ENTRADA',
      date: format(new Date(), 'yyyy-MM-dd'),
      talonNumber: '',
      offerValue: '',
      votesValue: '',
      ebdValue: '',
      value: '',
      description: '',
      contributorId: null,
      contributorName: '',
      isContributorRegistered: true,
      supplierId: '',
      supplierName: '',
      isSupplierRegistered: true,
      classificationId: ''
    })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:pl-64">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lançamentos Financeiros</h1>
              <p className="text-gray-600">Gerencie os lançamentos de entradas, dízimos e saídas</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={!canLaunchEntry && !canLaunchTithe && !canLaunchExpense}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingLaunch ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                  <DialogDescription>Preencha os dados do lançamento financeiro</DialogDescription>
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
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleSelectChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {canLaunchEntry && <SelectItem value="ENTRADA">Entrada</SelectItem>}
                          {canLaunchTithe && <SelectItem value="DIZIMO">Dízimo</SelectItem>}
                          {canLaunchExpense && <SelectItem value="SAIDA">Saída</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date" className="text-right">
                        Data
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="talonNumber" className="text-right">
                        Nº Talão
                      </Label>
                      <Input
                        id="talonNumber"
                        name="talonNumber"
                        value={formData.talonNumber}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>

                    {/* Campos específicos para Entrada */}
                    {formData.type === 'ENTRADA' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="offerValue">Valor Oferta</Label>
                          <Input
                            id="offerValue"
                            name="offerValue"
                            type="number"
                            step="0.01"
                            value={formData.offerValue}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <Label htmlFor="votesValue">Valor Voto</Label>
                          <Input
                            id="votesValue"
                            name="votesValue"
                            type="number"
                            step="0.01"
                            value={formData.votesValue}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <Label htmlFor="ebdValue">Valor EBD</Label>
                          <Input
                            id="ebdValue"
                            name="ebdValue"
                            type="number"
                            step="0.01"
                            value={formData.ebdValue}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    )}

                    {/* Campos específicos para Dízimo */}
                    {formData.type === 'DIZIMO' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="value">Valor</Label>
                          <Input
                            id="value"
                            name="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isContributorRegistered"
                            name="isContributorRegistered"
                            checked={formData.isContributorRegistered}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, isContributorRegistered: checked }))
                            }
                          />
                          <Label htmlFor="isContributorRegistered">Contribuinte cadastrado</Label>
                        </div>

                        {formData.isContributorRegistered ? (
                          <div>
                            <Label htmlFor="contributorId">Contribuinte</Label>
                            <Select
                              value={formData.contributorId ? formData.contributorId : ''}
                              onValueChange={(value) => handleSelectChange('contributorId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {contributors
                                  .filter((c) => c.id === formData.contributorId )
                                  .map((contributor) => (
                                    <SelectItem key={contributor.id} value={contributor.id}>
                                      {contributor.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="contributorName">Nome do Contribuinte</Label>
                            <Input
                              id="contributorName"
                              name="contributorName"
                              value={formData.contributorName}
                              onChange={handleInputChange}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campos específicos para Saída */}
                    {formData.type === 'SAIDA' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="value">Valor</Label>
                          <Input
                            id="value"
                            name="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isSupplierRegistered"
                            name="isSupplierRegistered"
                            checked={formData.isSupplierRegistered}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, isSupplierRegistered: checked }))
                            }
                          />
                          <Label htmlFor="isSupplierRegistered">Fornecedor cadastrado</Label>
                        </div>

                        {formData.isSupplierRegistered ? (
                          <div>
                            <Label htmlFor="supplierId">Fornecedor</Label>
                            <Select
                              value={formData.supplierId}
                              onValueChange={(value) => handleSelectChange('supplierId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    {supplier.razaoSocial}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="supplierName">Nome do Fornecedor</Label>
                            <Input
                              id="supplierName"
                              name="supplierName"
                              value={formData.supplierName}
                              onChange={handleInputChange}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campo de Classificação (apenas para Saída) */}
                    {formData.type === 'SAIDA' && (
                      <div>
                        <Label htmlFor="classificationId">Classificação</Label>
                        <Select
                          value={formData.classificationId}
                          onValueChange={(value) => handleSelectChange('classificationId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma classificação" />
                          </SelectTrigger>
                          <SelectContent>
                            {classifications.map((classification) => (
                              <SelectItem key={classification.id} value={classification.id}>
                                {classification.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                

                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>

                    <DialogFooter>
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      <Button type="submit">{editingLaunch ? 'Atualizar' : 'Salvar'}</Button>
                    </DialogFooter>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lançamentos Recentes</CardTitle>
              <CardDescription>Lista de lançamentos financeiros</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead>Contribuinte/Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {launches.map((launch) => (
                    <TableRow key={launch.id}>
                      <TableCell>{format(new Date(launch.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{launch.congregation?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            launch.type === 'ENTRADA'
                              ? 'default'
                              : launch.type === 'DIZIMO'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {launch.type === 'ENTRADA' ? 'Entrada' : launch.type === 'DIZIMO' ? 'Dízimo' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {launch.type === 'ENTRADA' ? (
                          <div>
                            <div>Oferta: R$ {launch.offerValue?.toFixed(2) || '0,00'}</div>
                            <div>Votos: R$ {launch.votesValue?.toFixed(2) || '0,00'}</div>
                            <div>EBD: R$ {launch.ebdValue?.toFixed(2) || '0,00'}</div>
                          </div>
                        ) : (
                          <div>R$ {launch.value?.toFixed(2) || '0,00'}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {launch.contributor?.name || launch.supplier?.razaoSocial || launch.contributorName || launch.supplierName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={launch.status === 'NORMAL' ? 'default' : 'destructive'}>
                          {launch.status === 'NORMAL' ? 'Normal' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={launch.approved ? 'default' : 'secondary'}>
                          {launch.approved ? 'Aprovado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(launch)}
                            disabled={launch.exported || !canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Botões de aprovação */}
                          {!launch.approved && launch.status === 'NORMAL' && (
                            <>
                              {(launch.type === 'ENTRADA' && canApproveEntry) ||
                              (launch.type === 'DIZIMO' && canApproveTithe) ||
                              (launch.type === 'SAIDA' && canApproveExpense) ? (
                                <Button variant="outline" size="sm" onClick={() => handleApprove(launch.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </>
                          )}

                          {launch.approved && launch.status === 'NORMAL' && (
                            <>
                              {(launch.type === 'ENTRADA' && canApproveEntry) ||
                              (launch.type === 'DIZIMO' && canApproveTithe) ||
                              (launch.type === 'SAIDA' && canApproveExpense) ? (
                                <Button variant="outline" size="sm" onClick={() => handleReprove(launch.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(launch.id)}
                            disabled={launch.status === 'CANCELED' || launch.exported}
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
