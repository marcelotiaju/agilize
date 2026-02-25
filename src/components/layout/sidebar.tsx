"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import packageJson from '../../../package.json';
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
  ChevronDown,
  Building2,
  List,
  User,
  PieChart,
  UserPen,
  Printer,
  ListCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image';
import { permission } from 'process'

const SYSTEM_VERSION = packageJson.version

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
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
  const canGenerateReport = ['canReportLaunches', 'canReportContributors', 'canReportMonthlySummary', 'canReportHistoryContribSynthetic', 'canReportHistoryContribAnalytic', 'canReportAudit'];
  const hasLaunchPermission = Boolean(canAccessLaunches.find(perm => session?.user?.[perm]));
  const hasSummaryPermission = Boolean(canAccesSummary.find(perm => session?.user?.[perm]));
  const hasGenerateReport = Boolean(canGenerateReport.find(perm => session?.user?.[perm]));

  const canCreate = Boolean(session?.user?.canCreate)
  const canManageUsers = Boolean(session?.user?.canManageUsers)
  const canReportLaunches = Boolean(session?.user?.canReportLaunches)
  const canReportContributors = Boolean(session?.user?.canReportContributors)
  const canReportMonthlySummary = Boolean(session?.user?.canReportMonthlySummary)
  const canReportHistoryContribSynthetic = Boolean(session?.user?.canReportHistoryContribSynthetic)
  const canReportHistoryContribAnalytic = Boolean(session?.user?.canReportHistoryContribAnalytic)
  const canReportAudit = Boolean(session?.user?.canReportAudit)

  const [openTesouraria, setOpenTesouraria] = useState(true)
  const [openCadastros, setOpenCadastros] = useState(false)
  const [openSeguranca, setOpenSeguranca] = useState(false)
  const [openReports, setOpenReports] = useState(false)

  useEffect(() => {
    const path = pathname || ''
    const isTesouraria = path.startsWith('/launches') || path.startsWith('/congregation-summary') || path.startsWith('/reports') || path.startsWith('/export') || path.startsWith('/delete-history')
    const isCadastros = path.startsWith('/contributors') || path.startsWith('/congregations') || path.startsWith('/suppliers') || path.startsWith('/classifications')
    const isSeguranca = path.startsWith('/users') || path.startsWith('/profiles') || path.startsWith('/profile')
    const isReports = path.startsWith('/reports/launches') || path.startsWith('/reports/contributors') || path.startsWith('/reports/monthly-summary') || path.startsWith('/reports/history-contrib-synthetic') || path.startsWith('/reports/history-contrib-analytic') || path.startsWith('/reports/audit')

    setOpenTesouraria(isTesouraria)
    setOpenCadastros(isCadastros)
    setOpenSeguranca(isSeguranca)
    setOpenReports(isReports)
  }, [pathname])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

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
            {/* <h1 className="text-xl font-bold">Agilize</h1> */}
            <div className='flex justify-center mb-0'>
              {/* <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-6">
                Agilize
              </h2> */}
              <Image
                src="/images/Logo_Agilize_Azul.png"
                alt="Logo do Agilize"
                width={100}
                height={80}
                priority
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="mt-5 px-2">
              <Link href="/dashboard" className={cn("group flex items-center px-2 py-2 text-base font-medium rounded-md", pathname === '/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')} onClick={() => setSidebarOpen(false)}>
                <Home className="mr-4 h-6 w-6" /> Início
              </Link>

              {/* Tesouraria */}
              {(hasLaunchPermission || hasSummaryPermission || canGenerateReport) && (
                <div className="mt-3">
                  <button type="button" onClick={() => setOpenTesouraria(!openTesouraria)} className="w-full flex items-center justify-between px-2 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50">
                    <span className="flex items-center"><FileText className="mr-4 h-6 w-6" /> Tesouraria</span>
                    <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openTesouraria ? 'rotate-0' : '-rotate-90')} />
                  </button>
                  {openTesouraria && (
                    <div className="mt-1 space-y-1 pl-8">
                      {hasLaunchPermission && (<Link href="/launches" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/launches' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><List className="mr-3 h-5 w-5 shrink-0" />Lançamentos</Link>)}
                      {hasSummaryPermission && (<Link href="/congregation-summary" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/congregation-summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><PieChart className="mr-3 h-5 w-5 shrink-0" />Resumo Diário</Link>)}

                      {/* Submenu Relatórios */}
                      {hasGenerateReport && (
                        <div className="mt-1">
                          <button type="button" onClick={() => setOpenReports(!openReports)} className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                            <span className="flex items-center"><Printer className="mr-3 h-5 w-5 shrink-0" />Relatórios</span>
                            <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openReports ? 'rotate-0' : '-rotate-90')} />
                          </button>
                          {openReports && (
                            <div className="mt-1 space-y-1 pl-8">
                              {canReportLaunches && <Link href="/reports/launches" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/launches' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Lançamentos</Link>}
                              {canReportContributors && <Link href="/reports/contributors" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/contributors' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Contribuintes</Link>}
                              {canReportMonthlySummary && <Link href="/reports/monthly-summary" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/monthly-summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Resumo Mensal</Link>}
                              {canReportHistoryContribSynthetic && <Link href="/reports/history-contrib-synthetic" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/history-contrib-synthetic' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Histórico de Contribuições Sintético</Link>}
                              {canReportHistoryContribAnalytic && <Link href="/reports/history-contrib-analytic" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/history-contrib-analytic' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Histórico de Contribuições Analítico</Link>}
                              {canReportAudit && <Link href="/reports/audit" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/audit' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Auditoria</Link>}
                            </div>
                          )}
                        </div>
                      )}

                      {session?.user?.canExport && (<Link href="/export" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/export' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Download className="mr-3 h-5 w-5 shrink-0" />Exportar Dados</Link>)}
                      {session?.user?.canDelete && (<Link href="/delete-history" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/delete-history' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Trash2 className="mr-3 h-5 w-5 shrink-0" />Excluir Histórico</Link>)}
                    </div>
                  )}
                </div>
              )}

              {/* Cadastros */}
              {canCreate && (
                <div className="mt-3">
                  <button type="button" onClick={() => setOpenCadastros(!openCadastros)} className="w-full flex items-center justify-between px-2 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50">
                    <span className="flex items-center"><Users className="mr-4 h-6 w-6" /> Cadastros</span>
                    <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openCadastros ? 'rotate-0' : '-rotate-90')} />
                  </button>
                  {openCadastros && (
                    <div className="mt-1 space-y-1 pl-8">
                      <Link href="/contributors" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/contributors' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><User className="mr-3 h-5 w-5 shrink-0" />Contribuintes</Link>
                      <Link href="/congregations" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/congregations' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Building2 className="mr-3 h-5 w-5 shrink-0" />Congregações</Link>
                      <Link href="/suppliers" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/suppliers' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Building className="mr-3 h-5 w-5 shrink-0" />Fornecedores</Link>
                      <Link href="/classifications" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/classifications' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><ListCheck className="mr-3 h-5 w-5 shrink-0" />Classificações</Link>
                    </div>
                  )}
                </div>
              )}

              {/* Segurança */}

              <div className="mt-3">
                <button type="button" onClick={() => setOpenSeguranca(!openSeguranca)} className="w-full flex items-center justify-between px-2 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50">
                  <span className="flex items-center"><UserCheck className="mr-4 h-6 w-6" /> Segurança</span>
                  <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openSeguranca ? 'rotate-0' : '-rotate-90')} />
                </button>
                {openSeguranca && (
                  <div className="mt-1 space-y-1 pl-8">
                    {canManageUsers && <Link href="/users" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/users' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Users className="mr-3 h-5 w-5 shrink-0" />Usuários</Link>}
                    {canManageUsers && <Link href="/profiles" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/profiles' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><UserPen className="mr-3 h-5 w-5 shrink-0" />Perfis</Link>}
                    <Link href="/profile" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/profile' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><UserCheck className="mr-3 h-5 w-5 shrink-0" />Acesso</Link>
                  </div>
                )}
              </div>

              {/* Utilitários */}
              {/* {session?.user?.canExport && (<Link href="/export" className={cn('group flex items-center px-2 py-2 text-base font-medium rounded-md mt-3', pathname === '/export' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Download className="mr-4 h-6 w-6" /> Exportar Dados</Link>)} */}
              {/* {session?.user?.canDelete && (<Link href="/delete-history" className={cn('group flex items-center px-2 py-2 text-base font-medium rounded-md mt-1', pathname === '/delete-history' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Trash2 className="mr-4 h-6 w-6" /> Excluir Histórico</Link>)} */}
            </nav>
          </div>
          <div className="flex shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full shrink-0">
              <div className="flex items-center gap-3">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Foto do perfil"
                    width={40}
                    height={40}
                    className="rounded-full object-cover h-10 w-10 border border-gray-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {(session?.user as any)?.profile?.name || 'Perfil'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {SYSTEM_VERSION}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
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
          <div className="flex h-16 shrink-0 items-center px-4 mt-3">
            {/* <h1 className="text-xl font-bold">Lance Fácil</h1> */}
            <Image
              src="/images/LogoDashboard.png" // Caminho relativo a partir da pasta `public`
              alt="Logo Dashboard do Agilize"
              width={400} // Largura da imagem
              height={300} // Altura da imagem
              priority
            />
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <nav className="mt-5 flex-1 space-y-1 px-2">
              <Link href="/dashboard" className={cn("group flex items-center px-2 py-2 text-sm font-medium rounded-md", pathname === '/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
                <Home className="mr-3 h-5 w-5 shrink-0" /> Início
              </Link>

              {/* Tesouraria */}
              {(hasLaunchPermission || hasSummaryPermission || hasGenerateReport) && (
                <div className="mt-3">
                  <button type="button" onClick={() => setOpenTesouraria(!openTesouraria)} className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                    <span className="flex items-center"><FileText className="mr-3 h-5 w-5 shrink-0" /> Tesouraria</span>
                    <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openTesouraria ? 'rotate-0' : '-rotate-90')} />
                  </button>
                  {openTesouraria && (
                    <div className="mt-1 space-y-1 pl-8">
                      {hasLaunchPermission && (<Link href="/launches" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/launches' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><List className="mr-3 h-5 w-5 shrink-0" />Lançamentos</Link>)}
                      {hasSummaryPermission && (<Link href="/congregation-summary" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/congregation-summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><PieChart className="mr-3 h-5 w-5 shrink-0" />Resumo Diário</Link>)}

                      {/* Submenu Relatórios */}
                      {hasGenerateReport && (
                        <div className="mt-1">
                          <button type="button" onClick={() => setOpenReports(!openReports)} className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                            <span className="flex items-center"><Printer className="mr-3 h-5 w-5 shrink-0" />Relatórios</span>
                            <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openReports ? 'rotate-0' : '-rotate-90')} />
                          </button>
                          {openReports && (
                            <div className="mt-1 space-y-1 pl-8">
                              {canReportLaunches && <Link href="/reports/launches" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/launches' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Lançamentos</Link>}
                              {canReportContributors && <Link href="/reports/contributors" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/contributors' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Contribuintes</Link>}
                              {canReportMonthlySummary && <Link href="/reports/monthly-summary" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/monthly-summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Printer className="mr-3 h-5 w-5 shrink-0" />Resumo Mensal</Link>}
                              {canReportHistoryContribSynthetic && <Link href="/reports/history-contrib-synthetic" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/history-contrib-synthetic' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Histórico de Contribuições Sintético</Link>}
                              {canReportHistoryContribAnalytic && <Link href="/reports/history-contrib-analytic" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/history-contrib-analytic' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Histórico de Contribuições Analítico</Link>}
                              {canReportAudit && <Link href="/reports/audit" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/reports/audit' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')} onClick={() => setSidebarOpen(false)}><Printer className="mr-3 h-5 w-5 shrink-0" />Relatório de Auditoria</Link>}
                            </div>
                          )}
                        </div>
                      )}

                      {session?.user?.canExport && (<Link href="/export" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/export' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Download className="mr-3 h-5 w-5 shrink-0" />Exportar Dados</Link>)}
                      {session?.user?.canDelete && (<Link href="/delete-history" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/delete-history' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Trash2 className="mr-3 h-5 w-5 shrink-0" />Excluir Histórico</Link>)}
                    </div>
                  )}
                </div>
              )}

              {/* Cadastros */}
              {canCreate && (
                <div className="mt-3">
                  <button type="button" onClick={() => setOpenCadastros(!openCadastros)} className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                    <span className="flex items-center"><Users className="mr-3 h-5 w-5 shrink-0" /> Cadastros</span>
                    <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openCadastros ? 'rotate-0' : '-rotate-90')} />
                  </button>
                  {openCadastros && (
                    <div className="mt-1 space-y-1 pl-8">
                      <Link href="/contributors" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/contributors' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><User className="mr-3 h-5 w-5 shrink-0" />Contribuintes</Link>
                      <Link href="/congregations" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/congregations' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Building2 className="mr-3 h-5 w-5 shrink-0" />Congregações</Link>
                      <Link href="/suppliers" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/suppliers' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Building className="mr-3 h-5 w-5 shrink-0" />Fornecedores</Link>
                      <Link href="/classifications" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/classifications' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><ListCheck className="mr-3 h-5 w-5 shrink-0" />Classificações</Link>
                    </div>
                  )}
                </div>
              )}

              {/* Segurança */}
              <div className="mt-3">
                <button type="button" onClick={() => setOpenSeguranca(!openSeguranca)} className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                  <span className="flex items-center"><UserCheck className="mr-3 h-5 w-5 shrink-0" /> Segurança</span>
                  <ChevronDown className={cn('h-4 w-4 transform transition-transform text-gray-500', openSeguranca ? 'rotate-0' : '-rotate-90')} />
                </button>
                {openSeguranca && (
                  <div className="mt-1 space-y-1 pl-8">
                    {canManageUsers && (<Link href="/users" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/users' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Users className="mr-3 h-5 w-5 shrink-0" />Usuários</Link>)}
                    {canManageUsers && (<Link href="/profiles" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/profiles' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><UserPen className="mr-3 h-5 w-5 shrink-0" />Perfis</Link>)}
                    <Link href="/profile" className={cn('group flex items-center px-2 py-2 text-sm rounded-md', pathname === '/profile' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><UserCheck className="mr-3 h-5 w-5 shrink-0" />Acesso</Link>
                  </div>
                )}
              </div>

              {/* Utilitários */}
              {/* {session?.user?.canExport && (<Link href="/export" className={cn('group flex items-center px-2 py-2 text-sm font-medium rounded-md mt-3', pathname === '/export' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Download className="mr-3 h-5 w-5 shrink-0" /> Exportar Dados</Link>)}
              {session?.user?.canDelete && (<Link href="/delete-history" className={cn('group flex items-center px-2 py-2 text-sm font-medium rounded-md mt-1', pathname === '/delete-history' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}><Trash2 className="mr-3 h-5 w-5 shrink-0" /> Excluir Histórico</Link>)} */}
            </nav>
          </div>
          <div className="flex shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full shrink-0">
              <div className="flex items-center gap-3">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Foto do perfil"
                    width={40}
                    height={40}
                    className="rounded-full object-cover h-10 w-10 border border-gray-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {(session?.user as any)?.profile?.name || 'Perfil'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {SYSTEM_VERSION}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                  title="Sair"
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
          {/* <h1 className="text-lg font-semibold">Agilize</h1> */}
          <div className='flex justify-center mb-0'>
            {/* <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-6">
              Agilize
            </h2> */}
            <Image
              src="/images/Logo_Agilize_Azul.png"
              alt="Logo do Agilize"
              width={100}
              height={100}
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="Foto do perfil"
                width={40}
                height={40}
                className="rounded-full object-cover h-10 w-10 border border-gray-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                <User className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div></div> {/* Spacer */}
          </div>
        </div>
      </div>
    </>
  )
}
