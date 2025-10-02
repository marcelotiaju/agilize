"use client"

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Church, Users, FileText, BarChart3 } from 'lucide-react'
import { stringify } from 'querystring'

export default function Home() {
  const { data: session, status } = useSession()

  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      const defaultPage = (session?.user as any)?.defaultPage;
      router.push(defaultPage ? defaultPage : "/dashboard");
    } else {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (status === "authenticated") {
    return null // Redirecionando para dashboard
  }

  // return (
  //   <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  //     <div className="container mx-auto px-4 py-16">
  //       <div className="text-center mb-16">
  //         <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
  //           Sistema de <span className="text-blue-600">Lançamentos Financeiros</span>
  //         </h1>
  //         <p className="text-xl text-gray-600 max-w-3xl mx-auto">
  //           Controle completo das finanças da sua congregação com segurança e praticidade
  //         </p>
  //         <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
  //           <Button 
  //             size="lg" 
  //             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
  //             onClick={() => router.push("/auth/signin")}
  //           >
  //             Fazer Login
  //           </Button>
  //           <Button 
  //             size="lg" 
  //             variant="outline"
  //             className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
  //             onClick={() => router.push("/auth/register")}
  //           >
  //             Criar Conta
  //           </Button>
  //         </div>
  //       </div>

  //       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
  //         <Card className="text-center">
  //           <CardHeader>
  //             <div className="mx-auto bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
  //               <Church className="h-8 w-8 text-blue-600" />
  //             </div>
  //             <CardTitle>Gestão de Congregações</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               Cadastre e gerencie múltiplas congregações com acesso controlado por usuário
  //             </CardDescription>
  //           </CardContent>
  //         </Card>

  //         <Card className="text-center">
  //           <CardHeader>
  //             <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
  //               <FileText className="h-8 w-8 text-green-600" />
  //             </div>
  //             <CardTitle>Lançamentos Financeiros</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               Registre entradas e saídas com controle de talões e histórico detalhado
  //             </CardDescription>
  //           </CardContent>
  //         </Card>

  //         <Card className="text-center">
  //           <CardHeader>
  //             <div className="mx-auto bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
  //               <Users className="h-8 w-8 text-purple-600" />
  //             </div>
  //             <CardTitle>Controle de Contribuintes</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               Cadastre contribuintes com informações detalhadas e histórico de doações
  //             </CardDescription>
  //           </CardContent>
  //         </Card>

  //         <Card className="text-center">
  //           <CardHeader>
  //             <div className="mx-auto bg-yellow-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
  //               <BarChart3 className="h-8 w-8 text-yellow-600" />
  //             </div>
  //             <CardTitle>Relatórios e Exportação</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               Gere relatórios em Excel com filtros personalizados para análise financeira
  //             </CardDescription>
  //           </CardContent>
  //         </Card>
  //       </div>

  //       <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
  //         <div className="max-w-4xl mx-auto">
  //           <h2 className="text-3xl font-bold text-center mb-12">Principais Recursos</h2>
            
  //           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  //             <div className="flex items-start">
  //               <div className="bg-blue-100 p-2 rounded-lg mr-4">
  //                 <FileText className="h-6 w-6 text-blue-600" />
  //               </div>
  //               <div>
  //                 <h3 className="text-xl font-semibold mb-2">Registros Detalhados</h3>
  //                 <p className="text-gray-600">
  //                   Controle completo de lançamentos financeiros com informações detalhadas como 
  //                   valores de ofertas, votos e EBD para entradas, e valores específicos para saídas.
  //                 </p>
  //               </div>
  //             </div>

  //             <div className="flex items-start">
  //               <div className="bg-green-100 p-2 rounded-lg mr-4">
  //                 <Users className="h-6 w-6 text-green-600" />
  //               </div>
  //               <div>
  //                 <h3 className="text-xl font-semibold mb-2">Gestão de Contribuintes</h3>
  //                 <p className="text-gray-600">
  //                   Cadastre contribuintes com informações pessoais, histórico de doações e 
  //                   controle por talões para maior organização.
  //                 </p>
  //               </div>
  //             </div>

  //             <div className="flex items-start">
  //               <div className="bg-purple-100 p-2 rounded-lg mr-4">
  //                 <BarChart3 className="h-6 w-6 text-purple-600" />
  //               </div>
  //               <div>
  //                 <h3 className="text-xl font-semibold mb-2">Dashboard Financeiro</h3>
  //                 <p className="text-gray-600">
  //                   Visualização gráfica das finanças com gráficos de barras e pizza para 
  //                   análise rápida da saúde financeira da congregação.
  //                 </p>
  //               </div>
  //             </div>

  //             <div className="flex items-start">
  //               <div className="bg-yellow-100 p-2 rounded-lg mr-4">
  //                 <Church className="h-6 w-6 text-yellow-600" />
  //               </div>
  //               <div>
  //                 <h3 className="text-xl font-semibold mb-2">Controle de Acesso</h3>
  //                 <p className="text-gray-600">
  //                   Sistema de permissões granular onde cada usuário tem acesso apenas às 
  //                   congregações associadas e funcionalidades permitidas.
  //                 </p>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="text-center">
  //         <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
  //         <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
  //           Acesse agora mesmo o sistema e comece a gerenciar as finanças da sua congregação 
  //           de forma eficiente e segura.
  //         </p>
  //         <div className="flex flex-col sm:flex-row gap-4 justify-center">
  //           <Button 
  //             size="lg" 
  //             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
  //             onClick={() => router.push("/auth/signin")}
  //           >
  //             Fazer Login
  //           </Button>
  //           <Button 
  //             size="lg" 
  //             variant="outline"
  //             className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
  //             onClick={() => router.push("/auth/register")}
  //           >
  //             Criar Conta
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // )
}