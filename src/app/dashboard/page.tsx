"use client"

import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Users,
  Download,
  Trash2,
  Building2,
  Church,
  List,
  User,
  PieChart
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { permission } from 'process'

export default function Dashboard() {
  const { data: session } = useSession()
  const router = useRouter()

    const canAccessLaunches = ['canLaunchEntry', 'canLaunchTithe', 'canLaunchExpense', 'canApproveEntry', 'canApproveTithe', 'canApproveExpense'];

    const hasLaunchPermission = canAccessLaunches.find(perm => session?.user?.[perm]);

  const menuOptions = [
    {
      title: "Lançamentos",
      description: "Registre entradas e saídas",
      icon: FileText,
      href: "/launches",
      color: "bg-blue-500 hover:bg-blue-600",
      permission: `${hasLaunchPermission}`
    },
    {
      title: "Exportar Dados",
      description: "Exporte para Excel",
      icon: Download,
      href: "/export",
      color: "bg-purple-500 hover:bg-purple-600",
      permission: "canExport"
    },
    {
      title: "Excluir Histórico",
      description: "Remova registros",
      icon: Trash2,
      href: "/delete-history",
      color: "bg-red-500 hover:bg-red-600",
      permission: "canDelete"
    },
    {
      title: "Congregações",
      description: "Gerencie congregações",
      icon: Church,
      href: "/congregations",
      color: "bg-indigo-500 hover:bg-indigo-600",
      permission: "canCreate"
    },
    {
      title: "Contribuintes",
      description: "Gerencie registros",
      icon: Users,
      href: "/contributors",
      color: "bg-green-500 hover:bg-green-600",
      permission: "canCreate"
    },
    {
      title: "Fornecedores",
      description: "Gerencie Fornecedores",
      icon: Building2,
      href: "/suppliers",
      color: "bg-yellow-500 hover:bg-yellow-600",
      permission: "canCreate"
    },
    {
      title: "Classificações",
      description: "Gerencie classificações",
      icon: List,
      href: "/classifications",
      color: "bg-teal-500 hover:bg-teal-600",
      permission: "canCreate"
    },
    {
    title: "Perfil",
    description: "Meus dados",
    icon: User,
    href: "/profile",
    color: "bg-indigo-500 hover:bg-indigo-600"
  },
  {
    title: "Resumo Congregação",
    description: "Visualize resumos financeiros",
    icon: PieChart,
    href: "/congregation-summary",
    color: "bg-yellow-500 hover:bg-yellow-600",
    permission: "canManageSummary"
  },
  ]

  const handleNavigation = (href :any) => {
    router.push(href)
  }

  return (
    <PermissionGuard 
    >
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <div className="p-6">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo, {session?.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-lg text-gray-600">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Cards de Informações Rápidas */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <Card className="bg-white shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2.5 rounded-xl mr-4">
                    <Church className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Congregações</p>
                    <p className="text-xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2.5 rounded-xl mr-4">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lançamentos</p>
                    <p className="text-xl font-bold">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2.5 rounded-xl mr-4">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contribuintes</p>
                    <p className="text-xl font-bold">42</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}

          {/* Botões do Menu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {menuOptions.map((option, index) => {
              // Verificar permissão se necessário
              if (option.permission && !session?.user?.[option.permission]) {
                return null
              }

              const Icon = option.icon
              
              return (
                <Card 
                  key={index} 
                  className="cursor-pointer transition-all duration-200 hover:shadow-md border-0 overflow-hidden rounded-2xl"
                  onClick={() => handleNavigation(option.href)}
                >
                  <CardContent className="p-0">
                    <div className={`${option.color} text-white p-6 flex flex-col items-center justify-center h-full min-h-[160px] rounded-2xl`}>
                      <Icon className="h-12 w-12 mb-3" />
                      <h2 className="text-xl font-bold text-center mb-1">{option.title}</h2>
                      <p className="text-base text-center opacity-90">{option.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Informações do Usuário */}
          {/* <div className="mt-8 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Informações da Conta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="text-base">{session?.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CPF</p>
                  <p className="text-base">{session?.user?.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">E-mail</p>
                  <p className="text-base">{session?.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="text-base">{session?.user?.phone || 'Não informado'}</p>
                </div>
                
                {/* Permissões de Sistema */}
                {/* <div className="md:col-span-2 mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">Permissões de Sistema</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-40">Exportar Dados:</span>
                      <span className={`text-sm font-medium ${session?.user?.canExport ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canExport ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-40">Excluir Histórico:</span>
                      <span className={`text-sm font-medium ${session?.user?.canDelete ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canDelete ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Permissões de Lançamento */}
                {/*<div className="md:col-span-2 mt-2">
                  <h3 className="font-medium text-gray-700 mb-2">Permissões de Lançamento</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Lançar Entrada:</span>
                      <span className={`text-sm font-medium ${session?.user?.canLaunchEntry ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canLaunchEntry ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Lançar Dízimo:</span>
                      <span className={`text-sm font-medium ${session?.user?.canLaunchTithe ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canLaunchTithe ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Lançar Saída:</span>
                      <span className={`text-sm font-medium ${session?.user?.canLaunchExpense ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canLaunchExpense ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div> 

                {/* Permissões de Aprovação */}
                {/*<div className="md:col-span-2 mt-2">
                  <h3 className="font-medium text-gray-700 mb-2">Permissões de Aprovação</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Aprovar Entrada:</span>
                      <span className={`text-sm font-medium ${session?.user?.canApproveEntry ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canApproveEntry ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Aprovar Dízimo:</span>
                      <span className={`text-sm font-medium ${session?.user?.canApproveTithe ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canApproveTithe ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Aprovar Saída:</span>
                      <span className={`text-sm font-medium ${session?.user?.canApproveExpense ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canApproveExpense ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Permissões de CRUD */}
                {/*<div className="md:col-span-2 mt-2">
                  <h3 className="font-medium text-gray-700 mb-2">Permissões de Cadastros</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Incluir Registros:</span>
                      <span className={`text-sm font-medium ${session?.user?.canCreate ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canCreate ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Editar Registros:</span>
                      <span className={`text-sm font-medium ${session?.user?.canEdit ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canEdit ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-32">Excluir Registros:</span>
                      <span className={`text-sm font-medium ${session?.user?.canExclude ? 'text-green-600' : 'text-red-600'}`}>
                        {session?.user?.canExclude ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
            </div>
          </div> */}
        </div>
      </div>
  </div>
  </PermissionGuard>
  )
}