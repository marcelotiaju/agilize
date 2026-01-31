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
  UserCheck,
  UserPen,
  PieChart
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { permission } from 'process'
import { Chevron } from 'react-day-picker'

export default function Dashboard() {
  const { data: session } = useSession()
  const router = useRouter()

    const canAccessLaunches = ['canLaunchVote',
      'canLaunchEbd', 
      'canLaunchCampaign',
      'canLaunchTithe',
      'canLaunchMission',
      'canLaunchCircle',
      'canLaunchServiceOffer',
      'canLaunchExpense',
      'canLaunchCarneReviver',
      'canApproveVote',
      'canApproveEbd', 
      'canApproveCampaign',
      'canApproveTithe',
      'canApproveMission',
      'canApproveCircle',
      'canApproveServiceOffer',
      'canApproveExpense'];
    const canAccesSummary = ['canListSummary', 'canGenerateSummary'];
    const hasLaunchPermission = canAccessLaunches.find(perm => session?.user?.[perm]);
    const hasSummaryPermission = canAccesSummary.find(perm => session?.user?.[perm]);

  const menuOptions = [
    {
      title: "Lançamentos",
      description: "Registre entradas e saídas",
      icon: FileText,
      href: "/launches",
      color: "from-sky-700 to-indigo-800",
      permission: `${hasLaunchPermission}`
    },
    {
      title: "Resumo Diário",
      description: "Visualize Resumo diário",
      icon: PieChart,
      href: "/congregation-summary",
      color: "from-yellow-600 to-amber-700",
      permission: `${hasSummaryPermission}`
    },
    {
      title: "Acesso",
      description: "Meus dados",
      icon: UserCheck,
      href: "/profile",
      color: "from-indigo-700 to-violet-800"
    },
    {
      title: "Usuários",
      description: "Gerencie Usuários",
      icon: Users,
      href: "/users",
      color: "from-indigo-700 to-violet-800"
    },
    {
      title: "Perfis",
      description: "Gerencie Perfis",
      icon: UserPen,
      href: "/profiles",
      color: "from-indigo-700 to-violet-800"
    },
    {
      title: "Exportar Dados",
      description: "Exporte para Excel",
      icon: Download,
      href: "/export",
      color: "from-violet-700 to-fuchsia-800",
      permission: "canExport"
    },
    {
      title: "Excluir Histórico",
      description: "Remova registros",
      icon: Trash2,
      href: "/delete-history",
      color: "from-rose-700 to-red-800",
      permission: "canDelete"
    },
    {
      title: "Congregações",
      description: "Gerencie congregações",
      icon: Church,
      href: "/congregations",
      color: "from-indigo-700 to-blue-800",
      permission: "canCreate"
    },
    {
      title: "Contribuintes",
      description: "Gerencie Contribuintes",
      icon: Users,
      href: "/contributors",
      color: "from-emerald-700 to-teal-800",
      permission: "canCreate"
    },
    {
      title: "Fornecedores",
      description: "Gerencie Fornecedores",
      icon: Building2,
      href: "/suppliers",
      color: "from-amber-700 to-orange-800",
      permission: "canCreate"
    },
    {
      title: "Classificações",
      description: "Gerencie classificações",
      icon: List,
      href: "/classifications",
      color: "from-cyan-700 to-sky-800",
      permission: "canCreate"
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

          {/* Botões do Menu */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
                      <div className={`${option.color} bg-linear-to-br text-white p-6 flex flex-col items-start h-full min-h-[140px] rounded-2xl`}> 
                          <div className="bg-white/10 p-3 rounded-lg flex items-center justify-center w-14 h-12">
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                          <div className="mt-4 w-full text-right">
                            <h2 className="text-lg font-semibold">{option.title}</h2>
                            <p className="text-sm opacity-90 mt-1">{option.description}</p>
                          </div>
                        </div>
                    </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
  </div>
  </PermissionGuard>
  )
}