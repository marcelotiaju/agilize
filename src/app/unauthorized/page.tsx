"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldX, ArrowLeft, Home, HelpCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function Unauthorized() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    // Se o usuário estiver logado, redirecionar para o dashboard após 5 segundos
    if (session) {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [session, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="text-gray-600 mt-2">
            Você não tem permissão para acessar esta página.
          </p>
        </div>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">O que aconteceu?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-gray-700">
              O sistema detectou que você tentou acessar uma página para a qual não tem permissão.
              Isso pode acontecer por vários motivos:
            </CardDescription>
            
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Sua conta não possui as permissões necessárias para acessar esta funcionalidade</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Você tentou acessar diretamente uma URL sem estar logado</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Sua sessão expirou e você precisa fazer login novamente</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>O administrador revogou suas permissões</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
              Como resolver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900">Se você já tem uma conta:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-4">
                  <li>Verifique se você está logado com a conta correta</li>
                  <li>Entre em contato com o administrador do sistema para solicitar as permissões necessárias</li>
                  <li>Tente fazer logout e login novamente</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Se você não tem uma conta:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-4">
                  <li>Entre em contato com o administrador do sistema para solicitar uma conta</li>
                  <li>Aguarde as instruções de criação de conta e acesso</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => router.back()} 
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          <Button 
            onClick={() => router.push('/')} 
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Página Inicial
          </Button>
          
          {session && (
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline"
              className="flex-1"
            >
              Dashboard
            </Button>
          )}
        </div>

        {session && (
          <div className="text-center text-sm text-gray-500 mt-4">
            Você será redirecionado automaticamente para o Dashboard em 5 segundos...
          </div>
        )}
      </div>
    </div>
  )
}