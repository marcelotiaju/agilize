import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getPrismaClient } from './prisma'
import { PrismaClient } from '@prisma/client'

/**
 * Obtém o PrismaClient correto baseado no alias armazenado na sessão do usuário.
 * Usado em API Routes (App Router).
 */
export async function getDb(req: NextRequest): Promise<PrismaClient> {
  const token = await getToken({ req })
  const alias = (token?.dbAlias as string) || undefined
  return getPrismaClient(alias)
}
