'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from 'next/link'
import Image from 'next/image';
import { User, Lock, Building2 } from 'lucide-react'
import packageJson from '../../../../package.json';

export default function SignInForm() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [aliases, setAliases] = useState<{ key: string, label: string }[]>([])
  const [selectedAlias, setSelectedAlias] = useState<string>('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  useEffect(() => {
    fetch('/api/db-aliases')
      .then(res => res.json())
      .then(data => {
        setAliases(data)
        if (data.length > 0) {
          setSelectedAlias(data[0].key)
        }
      })
      .catch(err => console.error('Erro ao buscar aliases:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        login,
        password,
        alias: selectedAlias,
        redirect: false,
      })

      if (result && result.error) {
        setError('Login ou senha incorretos')
      } else
        if (result) {
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
    <Card className="w-full">
      <CardHeader className="flex justify-center mb-0">
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

        <form onSubmit={handleSubmit} className="space-y-2 mt-[-30px]">
          <div>
            <Label className='mb-1' htmlFor="login">Login</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <User className="h-4 w-4" />
              </span>
              <Input
                id="login"
                name="login"
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label className='mb-1' htmlFor="password">Senha</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {aliases.length > 1 && (
            <div>
              <Label className='mb-1' htmlFor="alias">Alias</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 z-10">
                  <Building2 className="h-4 w-4" />
                </span>
                <Select value={selectedAlias} onValueChange={setSelectedAlias}>
                  <SelectTrigger id="alias" className="pl-10 w-full">
                    <SelectValue placeholder="Selecione a igreja" />
                  </SelectTrigger>
                  <SelectContent>
                    {aliases.map((alias) => (
                      <SelectItem key={alias.key} value={alias.key}>
                        {alias.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
      <div className="pt- pb-0">
        <div className="text-sm text-gray-500 text-center mt-[-20px]">Versão {packageJson.version}</div>
      </div>
    </Card>
  )
}