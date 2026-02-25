// app/lib/authOptions.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { login: credentials.login },
          include: { profile: true }
        })

        if (!user) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        // Preferir permissões do profile quando existir
        const p = user.profile
        const resolved = {
          canExport: !!p?.canExport,
          canDelete: !!p?.canDelete,
          canLaunchVote: !!p?.canLaunchVote,
          canLaunchEbd: !!p?.canLaunchEbd,
          canLaunchCampaign: !!p?.canLaunchCampaign,
          canLaunchTithe: !!p?.canLaunchTithe,
          canLaunchExpense: !!p?.canLaunchExpense,
          canLaunchMission: !!p?.canLaunchMission,
          canLaunchCircle: !!p?.canLaunchCircle,
          canLaunchServiceOffer: !!p?.canLaunchServiceOffer,
          canLaunchCarneReviver: !!p?.canLaunchCarneReviver,
          canApproveVote: !!p?.canApproveVote,
          canApproveEbd: !!p?.canApproveEbd,
          canApproveCampaign: !!p?.canApproveCampaign,
          canApproveTithe: !!p?.canApproveTithe,
          canApproveExpense: !!p?.canApproveExpense,
          canApproveMission: !!p?.canApproveMission,
          canApproveCircle: !!p?.canApproveCircle,
          canApproveServiceOffer: !!p?.canApproveServiceOffer,
          canApproveCarneReviver: !!p?.canApproveCarneReviver,
          canCreate: !!p?.canCreate,
          canEdit: !!p?.canEdit,
          canExclude: !!p?.canExclude,
          canManageUsers: !!p?.canManageUsers,
          canListSummary: !!p?.canListSummary,
          canGenerateSummary: !!p?.canGenerateSummary,
          canApproveTreasury: !!p?.canApproveTreasury,
          canApproveAccountant: !!p?.canApproveAccountant,
          canApproveDirector: !!p?.canApproveDirector,
          canDeleteLaunch: !!p?.canDeleteLaunch,
          canImportLaunch: !!p?.canImportLaunch,
          canReportLaunches: !!p?.canReportLaunches,
          canReportContributors: !!p?.canReportContributors,
          canReportMonthlySummary: !!p?.canReportMonthlySummary,
          canReportHistoryContribSynthetic: !!p?.canReportHistoryContribSynthetic,
          canReportHistoryContribAnalytic: !!p?.canReportHistoryContribAnalytic,
          canReportSummary: !!p?.canReportSummary,
          canReportAudit: !!p?.canReportAudit,
          canDeleteSummary: !!p?.canDeleteSummary,
          canTechnicalIntervention: !!p?.canTechnicalIntervention,
          defaultLaunchType: p?.defaultLaunchType ?? 'DIZIMO'
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          login: user.login,
          phone: user.phone ?? undefined,
          validFrom: user.validFrom,
          validTo: user.validTo,
          historyDays: user.historyDays,
          defaultPage: user.defaultPage,
          profile: user.profile ? { id: user.profile.id, name: user.profile.name } : null,
          ...resolved
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // manter lógica de expiração local se existir no projeto
        const tz = 'America/Sao_Paulo'
        const now = new Date()
        const zonedNow = utcToZonedTime(now, tz)
        const target = new Date(zonedNow)
        target.setHours(23, 59, 0, 0)
        if (zonedNow >= target) target.setDate(target.getDate() + 1)
        const targetUtc = zonedTimeToUtc(target, tz)
        const exp = Math.floor(targetUtc.getTime() / 1000)

        return {
          exp,
          ...token,
          sub: (user as any).id ?? token.sub,
          login: (user as any).login,
          cpf: (user as any).cpf,
          phone: (user as any).phone,
          validFrom: (user as any).validFrom,
          validTo: (user as any).validTo,
          historyDays: (user as any).historyDays,
          defaultPage: (user as any).defaultPage,
          profile: (user as any).profile ?? null,
          canExport: (user as any).canExport,
          canDelete: (user as any).canDelete,
          canLaunchVote: (user as any).canLaunchVote,
          canLaunchEbd: (user as any).canLaunchEbd,
          canLaunchCampaign: (user as any).canLaunchCampaign,
          canLaunchTithe: (user as any).canLaunchTithe,
          canLaunchExpense: (user as any).canLaunchExpense,
          canLaunchMission: (user as any).canLaunchMission,
          canLaunchCircle: (user as any).canLaunchCircle,
          canLaunchServiceOffer: (user as any).canLaunchServiceOffer,
          canLaunchCarneReviver: (user as any).canLaunchCarneReviver,
          canApproveVote: (user as any).canApproveVote,
          canApproveEbd: (user as any).canApproveEbd,
          canApproveCampaign: (user as any).canApproveCampaign,
          canApproveTithe: (user as any).canApproveTithe,
          canApproveExpense: (user as any).canApproveExpense,
          canApproveMission: (user as any).canApproveMission,
          canApproveCircle: (user as any).canApproveCircle,
          canApproveServiceOffer: (user as any).canApproveServiceOffer,
          canApproveCarneReviver: (user as any).canApproveCarneReviver,
          canCreate: (user as any).canCreate,
          canEdit: (user as any).canEdit,
          canExclude: (user as any).canExclude,
          canManageUsers: (user as any).canManageUsers,
          canListSummary: (user as any).canListSummary,
          canGenerateSummary: (user as any).canGenerateSummary,
          canApproveTreasury: (user as any).canApproveTreasury,
          canApproveAccountant: (user as any).canApproveAccountant,
          canApproveDirector: (user as any).canApproveDirector,
          canDeleteLaunch: (user as any).canDeleteLaunch,
          canImportLaunch: (user as any).canImportLaunch,
          canReportLaunches: (user as any).canReportLaunches,
          canReportContributors: (user as any).canReportContributors,
          canReportMonthlySummary: (user as any).canReportMonthlySummary,
          canReportHistoryContribSynthetic: (user as any).canReportHistoryContribSynthetic,
          canReportHistoryContribAnalytic: (user as any).canReportHistoryContribAnalytic,
          canReportSummary: (user as any).canReportSummary,
          canReportAudit: (user as any).canReportAudit,
          canDeleteSummary: (user as any).canDeleteSummary,
          defaultLaunchType: (user as any).defaultLaunchType ?? 'DIZIMO',
          canTechnicalIntervention: (user as any).canTechnicalIntervention,
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub,
        login: token.login as string | undefined,
        cpf: token.cpf as string | undefined,
        phone: token.phone as string | undefined,
        validFrom: typeof token.validFrom === "string" || typeof token.validFrom === "number" ? new Date(token.validFrom) : undefined,
        validTo: typeof token.validTo === "string" || typeof token.validTo === "number" ? new Date(token.validTo) : undefined,
        historyDays: typeof token.historyDays === "number" ? token.historyDays : undefined,
        defaultPage: typeof token.defaultPage === "string" ? token.defaultPage : undefined,
        profile: token.profile ?? undefined,
        canExport: typeof token.canExport === "boolean" ? token.canExport : undefined,
        canDelete: typeof token.canDelete === "boolean" ? token.canDelete : undefined,
        canLaunchVote: typeof token.canLaunchVote === "boolean" ? token.canLaunchVote : undefined,
        canLaunchEbd: typeof token.canLaunchEbd === "boolean" ? token.canLaunchEbd : undefined,
        canLaunchCampaign: typeof token.canLaunchCampaign === "boolean" ? token.canLaunchCampaign : undefined,
        canLaunchTithe: typeof token.canLaunchTithe === "boolean" ? token.canLaunchTithe : undefined,
        canLaunchExpense: typeof token.canLaunchExpense === "boolean" ? token.canLaunchExpense : undefined,
        canLaunchMission: typeof token.canLaunchMission === "boolean" ? token.canLaunchMission : undefined,
        canLaunchCircle: typeof token.canLaunchCircle === "boolean" ? token.canLaunchCircle : undefined,
        canLaunchServiceOffer: typeof token.canLaunchServiceOffer === "boolean" ? token.canLaunchServiceOffer : undefined,
        canLaunchCarneReviver: typeof token.canLaunchCarneReviver === "boolean" ? token.canLaunchCarneReviver : undefined,
        canApproveVote: typeof token.canApproveVote === "boolean" ? token.canApproveVote : undefined,
        canApproveEbd: typeof token.canApproveEbd === "boolean" ? token.canApproveEbd : undefined,
        canApproveCampaign: typeof token.canApproveCampaign === "boolean" ? token.canApproveCampaign : undefined,
        canApproveTithe: typeof token.canApproveTithe === "boolean" ? token.canApproveTithe : undefined,
        canApproveExpense: typeof token.canApproveExpense === "boolean" ? token.canApproveExpense : undefined,
        canApproveMission: typeof token.canApproveMission === "boolean" ? token.canApproveMission : undefined,
        canApproveCircle: typeof token.canApproveCircle === "boolean" ? token.canApproveCircle : undefined,
        canApproveServiceOffer: typeof token.canApproveServiceOffer === "boolean" ? token.canApproveServiceOffer : undefined,
        canApproveCarneReviver: typeof token.canApproveCarneReviver === "boolean" ? token.canApproveCarneReviver : undefined,
        canCreate: typeof token.canCreate === "boolean" ? token.canCreate : undefined,
        canEdit: typeof token.canEdit === "boolean" ? token.canEdit : undefined,
        canExclude: typeof token.canExclude === "boolean" ? token.canExclude : undefined,
        canManageUsers: typeof token.canManageUsers === "boolean" ? token.canManageUsers : undefined,
        canListSummary: typeof token.canListSummary === "boolean" ? token.canListSummary : undefined,
        canGenerateSummary: typeof token.canGenerateSummary === "boolean" ? token.canGenerateSummary : undefined,
        canApproveTreasury: typeof token.canApproveTreasury === "boolean" ? token.canApproveTreasury : undefined,
        canApproveAccountant: typeof token.canApproveAccountant === "boolean" ? token.canApproveAccountant : undefined,
        canApproveDirector: typeof token.canApproveDirector === "boolean" ? token.canApproveDirector : undefined,
        canDeleteLaunch: typeof token.canDeleteLaunch === "boolean" ? token.canDeleteLaunch : undefined,
        canImportLaunch: typeof token.canImportLaunch === "boolean" ? token.canImportLaunch : undefined,
        canReportLaunches: typeof token.canReportLaunches === "boolean" ? token.canReportLaunches : undefined,
        canReportContributors: typeof token.canReportContributors === "boolean" ? token.canReportContributors : undefined,
        canReportMonthlySummary: typeof token.canReportMonthlySummary === "boolean" ? token.canReportMonthlySummary : undefined,
        canReportHistoryContribSynthetic: typeof token.canReportHistoryContribSynthetic === "boolean" ? token.canReportHistoryContribSynthetic : undefined,
        canReportHistoryContribAnalytic: typeof token.canReportHistoryContribAnalytic === "boolean" ? token.canReportHistoryContribAnalytic : undefined,
        canReportSummary: typeof token.canReportSummary === "boolean" ? token.canReportSummary : undefined,
        canReportAudit: typeof token.canReportAudit === "boolean" ? token.canReportAudit : undefined,
        canDeleteSummary: typeof token.canDeleteSummary === "boolean" ? token.canDeleteSummary : undefined,
        defaultLaunchType: typeof token.defaultLaunchType === "string" ? token.defaultLaunchType : 'DIZIMO',
        canTechnicalIntervention: typeof token.canTechnicalIntervention === "boolean" ? token.canTechnicalIntervention : undefined,
      }
      if (typeof token.exp === 'number') {
        session.expires = new Date(token.exp * 1000).toISOString()
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }