import { PrismaClient } from '@prisma/client'

// 1. Garante que o objeto global seja tipado corretamente.
// Isso evita que o Next.js crie muitas conexões em desenvolvimento.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 2. Inicializa o Prisma Client
// Se já existir no objeto global (modo dev), reusa.
// Se estiver em produção, cria uma nova instância.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Opcional: Adicionar logging para depuração
    // log: ['query', 'error', 'warn'],
  })

// 3. Em modo de desenvolvimento, atribui a instância ao objeto global.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma