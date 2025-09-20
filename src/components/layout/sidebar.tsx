"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Home,
  FileText,
  Users,
  Download,
  Trash2,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Building,
  UserCheck,
  Building2,
  List,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image';
import { permission } from 'process'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Lançamentos', href: '/launches', icon: FileText, permission: 'canLaunchEntry'  },
  { name: 'Contribuintes', href: '/contributors', icon: Users, permission: 'canCreate' },
  { name: 'Congregações', href: '/congregations', icon: Building, permission: 'canCreate' },
  { name: 'Fornecedores', href: '/suppliers', icon: Building2, permission: 'canCreate' },
  { name: 'Classificações', href: '/classifications', icon: List, permission: 'canCreate' },
  { name: 'Usuários', href: '/users', icon: UserCheck, permission: 'canManageUsers' },
  { name: 'Perfil', href: '/profile', icon: User }, // Adicione esta linha
  { name: 'Exportar Dados', href: '/export', icon: Download, permission: 'canExport' },
  { name: 'Excluir Histórico', href: '/delete-history', icon: Trash2, permission: 'canDelete' },
  //{ name: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }
           
  // No componente Sidebar, modifique a renderização dos itens de menu:
const navigationItems = navigation
  .filter((item) => {
    // Se o item não tiver uma permissão específica, ele sempre será incluído
    if (!item.permission) {
      return true;
    }
    // Caso contrário, ele será incluído apenas se o usuário tiver a permissão
    return session?.user?.[item.permission];
  });

  return (
    <>
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold">Agilize</h1>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="mt-5 px-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                    pathname === item.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
        
        {/* Adicione esta seção para o link de registro */}
        {/* {session?.user?.canDelete && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/auth/register"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar Novo Usuário
            </Link>
          </div>
          )} */}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 flex-shrink-0 items-center px-4 mt-3">
            {/* <h1 className="text-xl font-bold">Lance Fácil</h1> */}
            <Image
              src="/images/LogoDashboard.png" // Caminho relativo a partir da pasta `public`
              alt="Logo Dashboard do Lance Fácil"
              width={400} // Largura da imagem
              height={300} // Altura da imagem
            />
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    pathname === item.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-2 shadow">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Agilize</h1>
          <div></div> {/* Spacer */}
        </div>
      </div>
    </>
  )
}
