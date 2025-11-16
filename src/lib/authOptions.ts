// app/lib/authOptions.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

export const authOptions : NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        cpf: { label: "CPF", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.cpf || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            cpf: credentials.cpf
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Retorna o usuário. O NextAuth vai pegar automaticamente o `id`, `name` e `email`.
        // Outros campos devem ser adicionados nos callbacks.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone ?? undefined,
          validFrom: user.validFrom,
          validTo: user.validTo,
          historyDays: user.historyDays,
          canExport: user.canExport,
          canDelete: user.canDelete,
          canLaunchEntry: user.canLaunchEntry,
          canLaunchTithe: user.canLaunchTithe,
          canLaunchExpense: user.canLaunchExpense,
          canLaunchMission: user.canLaunchMission,
          canLaunchCircle: user.canLaunchCircle,
          // adicionadas novas permissões
          canLaunchServiceOffer: user.canLaunchServiceOffer,
          canApproveEntry: user.canApproveEntry,
          canApproveTithe: user.canApproveTithe,
          canApproveExpense: user.canApproveExpense,
          canApproveMission: user.canApproveMission,
          canApproveCircle: user.canApproveCircle,
          canApproveServiceOffer: user.canApproveServiceOffer,
          canCreate: user.canCreate,
          canEdit: user.canEdit,
          canExclude: user.canExclude,
          canManageUsers: user.canManageUsers,
          defaultPage: user.defaultPage,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      // O 'user' só está presente na primeira vez que o token é criado (login)
      if (user) {
          // Usar o fuso desejado
          const tz = 'America/Sao_Paulo'
          const now = new Date()
          const zonedNow = utcToZonedTime(now, tz)

          // alvo = hoje às 23:59 no fuso; se já passou, usa amanhã às 23:59
          const target = new Date(zonedNow)
          target.setHours(23, 59, 0, 0)
          if (zonedNow >= target) {
            target.setDate(target.getDate() + 1)
          }

          const targetUtc = zonedTimeToUtc(target, tz)
          const exp = Math.floor(targetUtc.getTime() / 1000) // em segundos

        return {
          // Expira às 23:59 no fuso especificado
          exp,
          ...token,
          cpf: user.cpf,
          phone: user.phone,
          validFrom: user.validFrom,
          validTo: user.validTo,
          historyDays: user.historyDays,
          canExport: user.canExport,
          canDelete: user.canDelete,
          // Novas permissões
          canLaunchEntry: user.canLaunchEntry,
          canLaunchTithe: user.canLaunchTithe,
          canLaunchExpense: user.canLaunchExpense,
          canLaunchMission: user.canLaunchMission,
          canLaunchCircle: user.canLaunchCircle,
          canLaunchServiceOffer: user.canLaunchServiceOffer,
          canApproveEntry: user.canApproveEntry,
          canApproveTithe: user.canApproveTithe,
          canApproveExpense: user.canApproveExpense,
          canApproveMission: user.canApproveMission,
          canApproveCircle: user.canApproveCircle,
          canApproveServiceOffer: user.canApproveServiceOffer,
          canCreate: user.canCreate,
          canEdit: user.canEdit,
          canExclude: user.canExclude,
          canManageUsers: user.canManageUsers,
          defaultPage: user.defaultPage,
        }
      }
      return token
    },
    async session({ session, token }) {
      // O 'id' do usuário está no 'token.sub' por padrão.
      session.user = {
        ...session.user,
        id: token.sub,
        cpf: token.cpf as string | undefined,
        phone: token.phone as string | undefined,
        validFrom: typeof token.validFrom === "string" || typeof token.validFrom === "number"
          ? new Date(token.validFrom)
          : undefined,
        validTo: typeof token.validTo === "string" || typeof token.validTo === "number"
          ? new Date(token.validTo)
          : undefined,
        historyDays: typeof token.historyDays === "number" ? token.historyDays : undefined,
        canExport: typeof token.canExport === "boolean" ? token.canExport : undefined,
        canDelete: typeof token.canDelete === "boolean" ? token.canDelete : undefined,
        // Novas permissões
        canLaunchEntry: typeof token.canLaunchEntry === "boolean" ? token.canLaunchEntry : undefined,
        canLaunchTithe: typeof token.canLaunchTithe === "boolean" ? token.canLaunchTithe : undefined,
        canLaunchExpense: typeof token.canLaunchExpense === "boolean" ? token.canLaunchExpense : undefined,
        canLaunchMission: typeof token.canLaunchMission === "boolean" ? token.canLaunchMission : undefined,
        canLaunchCircle: typeof token.canLaunchCircle === "boolean" ? token.canLaunchCircle : undefined,
        canLaunchServiceOffer: typeof token.canLaunchServiceOffer === "boolean" ? token.canLaunchServiceOffer : undefined,
        canApproveEntry: typeof token.canApproveEntry === "boolean" ?  token.canApproveEntry : undefined,
        canApproveTithe: typeof token.canApproveTithe === "boolean" ? token.canApproveTithe : undefined,
        canApproveExpense: typeof token.canApproveExpense === "boolean" ? token.canApproveExpense : undefined,
        canApproveMission: typeof token.canApproveMission === "boolean" ? token.canApproveMission : undefined,
        canApproveCircle: typeof token.canApproveCircle === "boolean" ? token.canApproveCircle : undefined,
        canApproveServiceOffer: typeof token.canApproveServiceOffer === "boolean" ? token.canApproveServiceOffer : undefined,
        canCreate: typeof token.canCreate === "boolean" ? token.canCreate : undefined,
        canEdit: typeof token.canEdit === "boolean" ? token.canEdit : undefined,
        canExclude: typeof token.canExclude === "boolean" ?  token.canExclude : undefined,
        canManageUsers: typeof token.canManageUsers === "boolean" ? token.canManageUsers : undefined,
        defaultPage: typeof token.defaultPage === "string" ? token.defaultPage : undefined,
      }
      // Se o token tiver 'exp' (timestamp em segundos), informe a expiração na sessão
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

export { handler as GET, handler as POST}