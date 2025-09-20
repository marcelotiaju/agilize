"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function AuthRedirector() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Apenas redireciona se a sessão estiver autenticada e o usuário estiver na página inicial '/'
    if (status === "authenticated" && session?.user?.defaultPage && window.location.pathname === '/') {
      // Redireciona para a página padrão do usuário
      router.push(session.user.defaultPage);
    }
  }, [status, session, router]);

  return null; // Este componente não renderiza nada visualmente
}