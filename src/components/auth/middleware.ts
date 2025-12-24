import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

    // Se o usuário está na página de login e já está autenticado
  if (request.nextUrl.pathname === '/auth/signin' && token) {
    // Redirecionar para a página inicial preferida do usuário ou para o dashboard
    const defaultPage = token.defaultPage as string || '/dashboard'
    return NextResponse.redirect(new URL(defaultPage, request.url))
  }
  
  // Se o usuário está na página inicial e não está autenticado
  if (request.nextUrl.pathname === '/' && !token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  // Se o usuário está na página inicial e está autenticado
  if (request.nextUrl.pathname === '/' && token) {
    // Redirecionar para a página inicial preferida do usuário ou para o dashboard
    const defaultPage = token.defaultPage as string || '/dashboard'
    return NextResponse.redirect(new URL(defaultPage, request.url))
  }

  // Rotas que exigem autenticação
  const protectedRoutes = [
    '/dashboard',
    '/launches',
    '/contributors',
    '/users',
    '/export',
    '/delete-history',
    '/classifications',
    '/suppliers',
    '/congregations',
    '/congregation-summary',
    '/profiles',
  ]

  // Verificar se a rota atual exige autenticação
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Se a rota é protegida e não há token, redirecionar para login
  if (isProtectedRoute && !token) {
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth/signin|auth/register|unauthorized).*)',
  ],
}