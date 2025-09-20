import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { AuthRedirector } from "@/components/auth/AuthRedirector";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema Agilize",
  description: "Sistema para controle de lançamentos financeiros de congregações",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>    
          <AuthRedirector />
          {children}
        </Providers>
      </body>
    </html>
  )
}