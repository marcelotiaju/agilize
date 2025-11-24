'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image';

export default function SignInForm() {
  const [login, setLogin] = useState('')
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
        login,
        password,
        redirect: false,
      })

      if (result && result.error) {
        setError('Login ou senha incorretos')
      } else if (result) {
        const session = await getSession()
        if (session && session.user) {
          const user = session.user as typeof session.user & { validFrom?: string | Date; validTo?: string | Date }
          const validFrom = user.validFrom ? new Date(user.validFrom as any) : null
          const validTo = user.validTo ? new Date(user.validTo as any) : null
          const now = new Date()

          if ((validFrom && now < validFrom) || (validTo && now > validTo)) {
            setError('Sua conta não está ativa no momento')
            return
          }

          router.push('/')
        }
      }
    } catch (err) {
      setError('Ocorreu um erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Image 
          src="/images/Logo.png"
          alt="Logo do Agilize"
          width={400}
          height={100}
          priority
        />
      </CardHeader>
      <CardContent>
        {message && (
          <div className="mb-2 p-3 bg-green-100 text-green-700 rounded-md">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <Label htmlFor="login">Login</Label>
            <Input
              id="login"
              name="login"
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
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
      </CardContent>
    </Card>
  );
}