"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

export default function Register() {
  const [formData, setFormData] = useState({
    cpf: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    validFrom: '',
    validTo: '',
    historyDays: '30',
    canExport: false,
    canDelete: false,
    // Novas permissões
    canLaunchEntry: false,
    canLaunchTithe: false,
    canLaunchExpense: false,
    canApproveEntry: false,
    canApproveTithe: false,
    canApproveExpense: false,
    canCreate: false,
    canEdit: false,
    canExclude: false,
    defaultPage: '/dashboard',
    canManageSummary: false,
    canApproveTreasury: false,
    canApproveAccountant: false,
    canApproveDirector: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validar senhas
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setIsLoading(false)
      return
    }

    // Validar datas
    if (!formData.validFrom || !formData.validTo) {
      setError('As datas de validade são obrigatórias')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cpf: formData.cpf,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          historyDays: formData.historyDays,
          canExport: formData.canExport,
          canDelete: formData.canDelete,
          // Novas permissões
          canLaunchEntry: formData.canLaunchEntry,
          canLaunchTithe: formData.canLaunchTithe,
          canLaunchExpense: formData.canLaunchExpense,
          canApproveEntry: formData.canApproveEntry,
          canApproveTithe: formData.canApproveTithe,
          canApproveExpense: formData.canApproveExpense,
          canCreate: formData.canCreate,
          canEdit: formData.canEdit,
          canExclude: formData.canExclude,
          defaultPage: formData.defaultPage
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin?message=Registro realizado com sucesso')
        }, 2000)
      } else {
        setError(data.error || 'Erro ao registrar usuário')
      }
    } catch (error) {
      setError('Ocorreu um erro ao registrar o usuário')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">Registro Concluído!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>Seu usuário foi criado com sucesso. Você será redirecionado para a página de login.</p>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Criar Nova Conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Preencha os dados abaixo para se registrar
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Registro de Usuário</CardTitle>
            <CardDescription>
              Crie sua conta para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                />
              </div>
              
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Início da Validade</Label>
                  <Input
                    id="validFrom"
                    name="validFrom"
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="validTo">Fim da Validade</Label>
                  <Input
                    id="validTo"
                    name="validTo"
                    type="date"
                    required
                    value={formData.validTo}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="historyDays">Dias para Visualizar Histórico</Label>
                <Select
                  value={formData.historyDays}
                  onValueChange={(value) => handleSelectChange('historyDays', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Permissões de Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Permissões de Sistema</h3>
                
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
              
              {/* Permissões de Lançamento */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Permissões de Lançamento</h3>
                
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
              
              {/* Permissões de Aprovação */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Permissões de Aprovação</h3>
                
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
              
              {/* Permissões de CRUD */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Permissões de Cadastros</h3>
                
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

                  // No formulário, adicione a seção para selecionar a página inicial
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Página Inicial</h3>
                    
                    <div>
                      <Label htmlFor="defaultPage">Página inicial ao fazer login</Label>
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
                </div>
              </div>
              
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Registrando...' : 'Registrar'}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm">
              Já tem uma conta?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Faça login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}