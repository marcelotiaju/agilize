    // app/lib/authOptions.ts
  import NextAuth, { NextAuthOptions } from 'next-auth';
  import CredentialsProvider from 'next-auth/providers/credentials';
  import prisma from "@/lib/prisma"
  import bcrypt from "bcrypt"


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
        console.log('Usuário Encontrado:', user);

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
          canApproveEntry: user.canApproveEntry,
          canApproveTithe: user.canApproveTithe,
          canApproveExpense: user.canApproveExpense,
          canCreate: user.canCreate,
          canEdit: user.canEdit,
          canExclude: user.canExclude,
          canManageUsers: user.canManageUsers,
          defaultPage: user.defaultPage,
          canManageSummary: user.canManageSummary,
          canApproveTreasury: user.canApproveTreasury,
          canApproveAccountant: user.canApproveAccountant,
          canApproveDirector: user.canApproveDirector
        }
      }
    })
  ],
  secret: process.env.SECRET,
  //currentSecret,
  //process.env.SECRET,
  session: {
  },
  callbacks: {
    async jwt({ token, user }) {
      // O 'user' só está presente na primeira vez que o token é criado (login)
      if (user) {
        return {
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
          canApproveEntry: user.canApproveEntry,
          canApproveTithe: user.canApproveTithe,
          canApproveExpense: user.canApproveExpense,
          canCreate: user.canCreate,
          canEdit: user.canEdit,
          canExclude: user.canExclude,
          canManageUsers: user.canManageUsers,
          defaultPage: user.defaultPage,
          canManageSummary: user.canManageSummary,
          canApproveTreasury: user.canApproveTreasury,
          canApproveAccountant: user.canApproveAccountant,
          canApproveDirector: user.canApproveDirector
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
        canApproveEntry: typeof token.canApproveEntry === "boolean" ?  token.canApproveEntry : undefined,
        canApproveTithe: typeof token.canApproveTithe === "boolean" ? token.canApproveTithe : undefined,
        canApproveExpense: typeof token.canApproveExpense === "boolean" ? token.canApproveExpense : undefined,
        canCreate: typeof token.canCreate === "boolean" ? token.canCreate : undefined,
        canEdit: typeof token.canEdit === "boolean" ? token.canEdit : undefined,
        canExclude: typeof token.canExclude === "boolean" ?  token.canExclude : undefined,
        canManageUsers: typeof token.canManageUsers === "boolean" ? token.canManageUsers : undefined,
        defaultPage: typeof token.defaultPage === "string" ? token.defaultPage : undefined,
        canManageSummary: typeof token.canManageSummary === "boolean" ? token.canManageSummary : undefined,
        canApproveTreasury: typeof token.canApproveTreasury === "boolean" ? token.canApproveTreasury : undefined,
        canApproveAccountant: typeof token.canApproveAccountant === "boolean" ? token.canApproveAccountant : undefined,
        canApproveDirector: typeof token.canApproveDirector === "boolean" ? token.canApproveDirector : undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }