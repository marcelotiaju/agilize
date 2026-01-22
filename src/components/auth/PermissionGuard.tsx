"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

interface PermissionGuardProps {
  children: React.ReactNode
  requiredPermissions?: {
    canLaunchEntry?: boolean
    canLaunchCarneReviver?: boolean
    canLaunchTithe?: boolean
    canLaunchExpense?: boolean
    canApproveEntry?: boolean
    canApproveCarneReviver?: boolean
    canApproveTithe?: boolean
    canApproveExpense?: boolean
    canExport?: boolean
    canDelete?: boolean
    canCreate?: boolean
    canEdit?: boolean
    canExclude?: boolean,
    defaultPage?: boolean,
    canListSummary?: boolean,
    canGenerateSummary?: boolean,
    canManageUsers?: boolean,
    canApproveDirector?: boolean,
    canReportLaunches?: boolean,
    canReportContributors?: boolean,
    canReportSummary?: boolean,
    canDeleteLaunch ?: boolean
    
  }
  requireAuth?: boolean
  redirectTo?: string
}

export function PermissionGuard({ 
  children, 
  requiredPermissions = {},
  requireAuth = true,
  redirectTo = "/unauthorized"
}: PermissionGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Verificar se o usuário está autenticado (se necessário)
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    // Verificar permissões quando a sessão estiver carregada
    if (status === "authenticated") {
      const hasAllPermissions = Object.entries(requiredPermissions).every(
        ([key, required]) => {
          if (!required) return true // Se não é necessário, pula a verificação
          return session.user[key] === true
        }
      )

      if (!hasAllPermissions) {
        router.push(redirectTo)
        return
      }
    }
  }, [session, status, requiredPermissions, redirectTo, router])

  // Se ainda está carregando ou não tem permissão, não renderiza nada
  if (status === "loading" || 
      (status === "authenticated" && 
       Object.entries(requiredPermissions).some(([key, required]) => required && !session.user[key]))) {
    return null
  }

  return <>{children}</>
}