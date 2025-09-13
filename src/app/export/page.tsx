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

interface Congregation {
  id: string
  code: string
  name: string
}

export default function Export() {
  const { data: session } = useSession()
  const [congregations, setCongregations] = useState<Congregation[]>([])
  const [formData, setFormData] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'ENTRADA',
    congregationIds: [] as string[]
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (formData.congregationIds.length === 0) {
      alert('Selecione pelo menos uma congregação')
      return
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

  return (
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

                    <div>
                      <Label htmlFor="type">Tipo de Dados</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleSelectChange('type', value)}
                        defaultValue="ENTRADA"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENTRADA">ENTRADA</SelectItem>
                          <SelectItem value="DIZIMO">DIZIMO</SelectItem>
                          <SelectItem value="SAIDA">SAIDA</SelectItem>
                        </SelectContent>
                      </Select>
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
  )
}