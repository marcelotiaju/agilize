"use client"

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SignIn() {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        cpf,
        password,
        redirect: false,
      })

      if (result && result.error) {
        setError('CPF ou senha incorretos')
      } else if (result){
        const session = await getSession()
        if (session && session.user) {
          const user = session.user as typeof session.user & { validFrom: string; validTo: string }
          const validFrom = new Date(user.validFrom)
          const validTo = new Date(user.validTo)
          const now = new Date()

          if (now < validFrom || now > validTo) {
            setError('Sua conta não está ativa no momento')
            return
          }

          router.push('/dashboard')
        }
      }
    } catch (error) {
      setError('Ocorreu um erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Lance Fácil
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Entre com suas credenciais para acessar o sistema
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Digite seu CPF e senha para entrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            
            {/* <div className="mt-4 text-center text-sm">
              Não tem uma conta?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                Registre-se
              </Link>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}