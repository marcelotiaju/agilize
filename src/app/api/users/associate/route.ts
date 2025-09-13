import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId, congregationIds } = await request.json()

    if (!userId || !Array.isArray(congregationIds)) {
      return NextResponse.json({ error: "ID do usuário e lista de congregações são obrigatórios" }, { status: 400 })
    }

    console.log('API: Associando usuário', userId, 'às congregações:', congregationIds)

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se todas as congregações existem
    const congregations = await prisma.congregation.findMany({
      where: {
        id: {
          in: congregationIds
        }
      }
    })

    if (congregations.length !== congregationIds.length) {
      return NextResponse.json({ error: "Uma ou mais congregações não foram encontradas" }, { status: 400 })
    }

    // Remover todas as associações existentes do usuário
    await prisma.userCongregation.deleteMany({
      where: {
        userId: userId
      }
    })

    // Criar novas associações
    if (congregationIds.length > 0) {
      const associations = congregationIds.map(congregationId => ({
        userId: userId,
        congregationId: congregationId
      }))

      await prisma.userCongregation.createMany({
        data: associations
      })
    }

    console.log('API: Associação concluída com sucesso')

    return NextResponse.json({ 
      message: "Usuário associado às congregações com sucesso",
      associations: congregationIds.length
    })

  } catch (error) {
    console.error('API: Erro ao associar usuário:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
