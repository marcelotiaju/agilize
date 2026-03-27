import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            login?: string
            phone?: string
            validFrom?: Date
            validTo?: Date
            historyDays?: number
            maxRetroactiveDays?: number
            maxRetroactiveDaysEdit?: number
            defaultPage?: string
            profile?: { id: string; name: string } | null
            canExport?: boolean
            canDelete?: boolean
            canLaunchVote?: boolean
            canLaunchEbd?: boolean
            canLaunchCampaign?: boolean
            canLaunchTithe?: boolean
            canLaunchExpense?: boolean
            canLaunchMission?: boolean
            canLaunchCircle?: boolean
            canLaunchServiceOffer?: boolean
            canLaunchCarneReviver?: boolean
            canLaunchCarneAfrica?: boolean
            canLaunchRendaBruta?: boolean
            canApproveVote?: boolean
            canApproveEbd?: boolean
            canApproveCampaign?: boolean
            canApproveTithe?: boolean
            canApproveExpense?: boolean
            canApproveMission?: boolean
            canApproveCircle?: boolean
            canApproveServiceOffer?: boolean
            canApproveCarneReviver?: boolean
            canCreate?: boolean
            canEdit?: boolean
            canExclude?: boolean
            canManageUsers?: boolean
            canListSummary?: boolean
            canGenerateSummary?: boolean
            canApproveTreasury?: boolean
            canApproveAccountant?: boolean
            canApproveDirector?: boolean
            canReportLaunches?: boolean
            canReportContributors?: boolean
            canReportMonthlySummary?: boolean
            canReportHistoryContribSynthetic?: boolean
            canReportHistoryContribAnalytic?: boolean
            canReportSummary?: boolean
            canReportAudit?: boolean
            canReportAccountability?: boolean
            canDeleteLaunch?: boolean
            canImportLaunch?: boolean
            canDeleteSummary?: boolean
            defaultLaunchType?: string
            canTechnicalIntervention?: boolean
            canManageBankIntegration?: boolean
            // Multi-database information
            dbAlias?: string
            dbLogoUrl?: string
            image?: string
            // Force logout timestamp
            forceLogoutAt?: number | null
        } & DefaultSession["user"]
        error?: "ForceLogout" | string
    }

    interface User {
        id: string
        login?: string
        phone?: string
        validFrom?: Date
        validTo?: Date
        historyDays?: number
        maxRetroactiveDays?: number
        maxRetroactiveDaysEdit?: number
        defaultPage?: string
        profile?: { id: string; name: string } | null
        // ... all other permission fields ...
        dbAlias?: string
        dbLogoUrl?: string
        forceLogoutAt?: Date | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        dbAlias?: string
        dbLogoUrl?: string
        forceLogoutAt?: number | null
    }
}
