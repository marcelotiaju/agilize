// app/profile/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, User, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SelectContent, SelectValue, Select, SelectItem, SelectTrigger } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [defaultPage, setDefaultPage] = useState(session?.user?.defaultPage || '/dashboard')
  const router = useRouter()
  const [userImage, setUserImage] = useState(session?.user?.image || null)
  const [congregationDisplay, setCongregationDisplay] = useState<string>('')
  const { update } = useSession()

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          if (data.image) setUserImage(data.image)

          // Congregações associadas: 1 = nome, 2+ = "***"
          const congregations = data.congregations || []
          if (congregations.length === 0) {
            setCongregationDisplay('Não informado')
          } else if (congregations.length === 1) {
            setCongregationDisplay(congregations[0]?.congregation?.name || 'Não informado')
          } else {
            setCongregationDisplay('***')
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
        setCongregationDisplay('Não informado')
      }
    }
    loadProfile()
  }, [])


  const handleImageUpdate = async (url: string) => {
    setUserImage(url)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url })
      })
      if (!response.ok) throw new Error('Falha ao atualizar imagem')
      await update({ image: url })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Erro ao salvar foto de perfil' })
    }
  }

  // Adicione a função para atualizar a página inicial
  const updateDefaultPage = async () => {
    try {
      const response = await fetch('/api/user/update-default-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ defaultPage })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Página inicial atualizada com sucesso' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Erro ao atualizar página inicial' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao atualizar a página inicial' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    // Validar senhas
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        // Limpar os campos após sucesso
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao alterar a senha' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:pl-64">
        <div className="p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="text-gray-600">Gerencie suas informações de conta</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card de informações do usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Informações da Conta
                  </CardTitle>
                  <CardDescription>
                    Seus dados cadastrais no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="font-medium">{session?.user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">E-mail</p>
                    <p className="font-medium">{session?.user?.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{session?.user?.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Congregação</p>
                    <p className="font-medium">{congregationDisplay || 'Carregando...'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Foto de Perfil */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Foto de Perfil
                  </CardTitle>
                  <CardDescription>
                    Atualize sua foto de identificação
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ImageUpload
                    value={userImage}
                    onChange={handleImageUpdate}
                    onRemove={() => handleImageUpdate('')}
                    folder="user"
                  />
                </CardContent>
              </Card>

              {/* Card de alteração de senha */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="mr-2 h-5 w-5" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>
                    Atualize sua senha de acesso ao sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <Eye className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <Eye className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <Eye className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Alterando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Alterar Senha
                        </>
                      )}
                    </Button>

                    {/* <div className="space-y-4">
                      <h3 className="text-lg font-medium border-b pb-2">Página Inicial</h3>
                      
                      <div>
                        <Label htmlFor="defaultPage">Página inicial ao fazer login</Label>
                        <Select
                          value={defaultPage}
                          onValueChange={(value) => setDefaultPage(value)}
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
                    </div> */}

                    {/* <Button type="button" onClick={updateDefaultPage} className="w-full" disabled={isLoading}>
                      {isLoading ? 'Salvando...' : 'Salvar Página Inicial'}
                    </Button> */}

                    {message.text && (
                      <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                        <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                          {message.text}
                        </AlertDescription>
                      </Alert>
                    )}


                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div >
      </div >
    </div >
  )
}