"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Home,
  FileText,
  PieChart,
  ChevronUp,
  List,
  Printer,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function Footer() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isReportsOpen, setIsReportsOpen] = useState(false)

  // Não mostrar footer em páginas de autenticação
  if (pathname?.startsWith('/auth')) {
    return null
  }

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

  const canReportLaunches = Boolean(session?.user?.canReportLaunches)
  const canReportContributors = Boolean(session?.user?.canReportContributors)
  const canReportMonthlySummary = Boolean(session?.user?.canReportMonthlySummary)
  const canReportHistoryContribSynthetic = Boolean(session?.user?.canReportHistoryContribSynthetic)
  const canReportHistoryContribAnalytic = Boolean(session?.user?.canReportHistoryContribAnalytic)
  const canReportAudit = Boolean(session?.user?.canReportAudit)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    if (href === '/launches') {
      return pathname?.startsWith('/launches')
    }
    if (href === '/congregation-summary') {
      return pathname?.startsWith('/congregation-summary')
    }
    if (href === '/reports') {
      return pathname?.startsWith('/reports')
    }
    return false
  }

  return (
    <footer className="md:hidden lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-center z-30">
      <nav className="flex gap-2 px-4 items-center">
        {/* Início */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
            isActive('/dashboard')
              ? 'text-gray-900 bg-gray-100'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          )}
          title="Página Inicial"
        >
          <Home className="h-6 w-6" />
          <span className="text-xs font-medium">Início</span>
        </Link>

        {/* Lançamentos */}
        {hasLaunchPermission && (
          <Link
            href="/launches"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
              isActive('/launches')
                ? 'text-sky-900 bg-sky-50'
                : 'text-sky-700 hover:text-sky-900 hover:bg-sky-50'
            )}
            title="Lançamentos"
          >
            <List className="h-6 w-6" />
            <span className="text-xs font-medium">Lançamentos</span>
          </Link>
        )}

        {/* Resumo */}
        {hasSummaryPermission && (
          <Link
            href="/congregation-summary"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
              isActive('/congregation-summary')
                ? 'text-amber-700 bg-amber-50'
                : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
            )}
            title="Resumo Diário"
          >
            <PieChart className="h-6 w-6" />
            <span className="text-xs font-medium">Resumo</span>
          </Link>
        )}

        {/* Relatórios */}
        {hasGenerateReport && (
          <Popover open={isReportsOpen} onOpenChange={setIsReportsOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
                  isActive('/reports')
                    ? 'text-violet-700 bg-violet-50'
                    : 'text-violet-500 hover:text-violet-700 hover:bg-violet-50'
                )}
                title="Relatórios"
              >
                <Printer className="h-6 w-6" />
                <span className="text-xs font-medium">Relatórios</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="top"
              className="w-48 p-0 mb-2"
            >
              <div className="flex flex-col divide-y">
                {canReportLaunches && (
                  <Link
                    href="/reports/launches"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Lançamentos</span>
                  </Link>
                )}
                {canReportContributors && (
                  <Link
                    href="/reports/contributors"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Contribuintes</span>
                  </Link>
                )}
                {canReportMonthlySummary && (
                  <Link
                    href="/reports/monthly-summary"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Resumo Mensal</span>
                  </Link>
                )}
                {canReportHistoryContribSynthetic && (
                  <Link
                    href="/reports/history-contrib-synthetic"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Histórico Sintético</span>
                  </Link>
                )}
                {canReportHistoryContribAnalytic && (
                  <Link
                    href="/reports/history-contrib-analytic"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Histórico Analítico</span>
                  </Link>
                )}
                {canReportAudit && (
                  <Link
                    href="/reports/audit"
                    className="px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    onClick={() => setIsReportsOpen(false)}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Relatório de Auditoria</span>
                  </Link>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Botão Sair */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 h-auto py-2 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all rounded-md"
          title="Sair"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs font-medium">Sair</span>
        </Button>
      </nav>
    </footer>
  )
}
