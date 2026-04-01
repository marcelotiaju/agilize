import { PrismaClient } from '@prisma/client'

// Cache de instâncias do Prisma Client por alias
const clientCache = new Map<string, PrismaClient>()

/**
 * Retorna o alias padrão configurado no DB_ALIASES (primeiro da lista)
 */
export function getDefaultAlias(): string {
  const aliases = process.env.DB_ALIASES || ""
  const firstPair = aliases.split(',')[0]
  return firstPair ? firstPair.split(':')[0].trim() : "AGILIZE"
}

/**
 * Retorna uma instância do Prisma Client para o alias fornecido.
 * Se a instância já existir no cache, ela é reutilizada.
 */
export function getPrismaClient(alias?: string): PrismaClient {
  const targetAlias = (alias || getDefaultAlias()).toUpperCase()
  
  if (clientCache.has(targetAlias)) {
    return clientCache.get(targetAlias)!
  }

  const dbUrl = process.env[`DB_ALIAS_${targetAlias}`]
  
  if (!dbUrl) {
    // Fallback para DATABASE_URL se o alias for o padrão e não houver específica
    if (targetAlias === getDefaultAlias().toUpperCase() && process.env.DATABASE_URL) {
       const client = new PrismaClient({
         datasources: { db: { url: process.env.DATABASE_URL } }
       })
       clientCache.set(targetAlias, client)
       return client
    }
    throw new Error(`Configuração de banco de dados não encontrada para o alias: ${targetAlias}`)
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    // Opcional: Adicionar logging para depuração
    // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  clientCache.set(targetAlias, client)
  return client
}

// Para manter compatibilidade com importações existentes que usam 'prisma' diretamente
// CUIDADO: Isso usará o banco padrão. O ideal é migrar tudo para getPrismaClient()
// No entanto, como export prisma, ele será instanciado no carregamento do módulo.
export const prisma = getPrismaClient()

export default prisma