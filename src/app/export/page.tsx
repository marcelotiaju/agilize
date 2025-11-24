// 12. Página de Exportação (pages/export.tsx)
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface Congregation {
  id: string
  code: string
  name: string
}

export default function Export() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [formData, setFormData] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd'),
    type: ['DIZIMO','OFERTA_CULTO','MISSAO','CIRCULO','VOTO','EBD','CAMPANHA','SAIDA'], 
    congregationIds: [] as string[],
    status: ['APPROVED'] // Apenas lançamentos aprovados
})
  const [isExporting, setIsExporting] = useState(false)

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

  const handleTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => {
      const types = checked
        ? [...prev.type, type]
        : prev.type.filter(t => t !== type)
      
      return { ...prev, type: types }
     })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (formData.type.length === 0) {
      alert('Selecione pelo menos um tipo de lançamento')
      return
    }
    
    if (formData.congregationIds.length === 0) {
      alert('Selecione pelo menos uma congregação')
      return
    }

    if (formData.status.length === 0) {
    alert('Selecione pelo menos um status de lançamento');
    return;
    }

    setIsExporting(true)
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Criar blob para download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao exportar dados')
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
      alert('Erro ao exportar dados')
    } finally {
      setIsExporting(false)
    }
  }

  const allSelected = congregations.length > 0 && formData.congregationIds.length === congregations.length
  
  const handleStatusChange = (status: string, checked: boolean) => {
  setFormData(prev => {
    const statuses = checked
      ? [...prev.status, status]
      : prev.status.filter(s => s !== status);

    return { ...prev, status: statuses };
  });
  };

  return (
    <PermissionGuard 
      requiredPermissions={{
        canExport: true
      }}
    >
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Exportar Dados</h1>
            <p className="text-gray-600">Exporte lançamentos para o Excel</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileSpreadsheet className="mr-2 h-5 w-5" />
                    Configurar Exportação
                  </CardTitle>
                  <CardDescription>
                    Selecione o período e os dados que deseja exportar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      <div className="space-y-1 mt-2">
                        <div className="md:flex md:space-x-6">
                          <div className="md:flex-1">
                            <Label className='mb-2'>Tipo de Dados</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-dizimo"
                                  checked={formData.type.includes('DIZIMO')}
                                  onCheckedChange={(checked) => handleTypeChange('DIZIMO', checked as boolean)}
                                />
                                <Label htmlFor="type-dizimo">Dízimos</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-oferta"
                                  checked={formData.type.includes('OFERTA_CULTO')}
                                  onCheckedChange={(checked) => handleTypeChange('OFERTA_CULTO', checked as boolean)}
                                />
                                <Label htmlFor="type-oferta">Oferta de Culto</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-missao"
                                  checked={formData.type.includes('MISSAO')}
                                  onCheckedChange={(checked) => handleTypeChange('MISSAO', checked as boolean)}
                                />
                                <Label htmlFor="type-missao">Missão</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-circulo"
                                  checked={formData.type.includes('CIRCULO')}
                                  onCheckedChange={(checked) => handleTypeChange('CIRCULO', checked as boolean)}
                                />
                                <Label htmlFor="type-circulo">Círculo de Oração</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-voto"
                                  checked={formData.type.includes('VOTO')}
                                  onCheckedChange={(checked) => handleTypeChange('VOTO', checked as boolean)}
                                />
                                <Label htmlFor="type-votos">Voto</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-ebd"
                                  checked={formData.type.includes('EBD')}
                                  onCheckedChange={(checked) => handleTypeChange('EBD', checked as boolean)}
                                />
                                <Label htmlFor="type-ebd">EBD</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-campanha"
                                  checked={formData.type.includes('CAMPANHA')}
                                  onCheckedChange={(checked) => handleTypeChange('CAMPANHA', checked as boolean)}
                                />
                                <Label htmlFor="type-campanha">Campanha</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="type-saida"
                                  checked={formData.type.includes('SAIDA')}
                                  onCheckedChange={(checked) => handleTypeChange('SAIDA', checked as boolean)}
                                />
                                <Label htmlFor="type-saida">Saídas</Label>
                              </div>
                            </div>
                          </div>

                          <div className="md:w-56 mt-4 md:mt-0">
                            <Label className="mb-2">Status dos Lançamentos</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="status-approved"
                                  checked={formData.status.includes('APPROVED')}
                                  onCheckedChange={(checked) => handleStatusChange('APPROVED', checked as boolean)}
                                />
                                <Label htmlFor="status-approved">Não Exportados</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="status-exported"
                                  checked={formData.status.includes('EXPORTED')}
                                  onCheckedChange={(checked) => handleStatusChange('EXPORTED', checked as boolean)}
                                />
                                <Label htmlFor="status-exported">Exportados</Label>
                              </div>
                            </div>
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

                    <Button type="submit" className="w-full" disabled={isExporting}>
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Exportando...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Exportar Dados
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
                  <CardTitle className="flex items-center text-yellow-600">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Permissões</h4>
                    <p className="text-sm text-gray-600">
                      Apenas usuários com permissão de exportação podem realizar esta operação.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Formato do Arquivo</h4>
                    <p className="text-sm text-gray-600">
                      Os dados serão exportados no formato Excel (.xlsx) com abas separadas para lançamentos e contribuintes.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Restrições</h4>
                    <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                      <li>Apenas registros com status "Normal" serão exportados</li>
                      <li>Após a exportação, os registros não poderão mais ser editados</li>
                      <li>Não é permitido exportar dados com data futura</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  </PermissionGuard>
  )
}