"use client"

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    console.log('session debug', session)
    // aguarda resolução do status antes de redirecionar
    if (status === "loading") return

    if (status === "authenticated") {
      const defaultPage = (session?.user as any)?.defaultPage ?? "/dashboard"
      console.log(defaultPage)
      router.replace(defaultPage)
      return
    }

    // usuário não autenticado
    router.replace("/auth/signin")
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (status === "authenticated") {
    return null // redirecionamento já realizado
  }

  return null
}