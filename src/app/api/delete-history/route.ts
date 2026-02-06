import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canDelete) {
    return NextResponse.json({ error: "Sem permissão para excluir histórico" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { startDate, endDate, type, congregationIds, launchStatus } = body

    const launchDateStart = new Date(`${body.startDate}T12:00:00Z`)
    const launchDateEnd = new Date(`${body.endDate}T12:00:00Z`)
    launchDateStart.setHours(0, 0, 0, 0)
    launchDateEnd.setHours(0, 0, 0, 0)

    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      }
    })

    if (userCongregations.length !== congregationIds.length) {
      return NextResponse.json({ error: "Acesso não autorizado a uma ou mais congregações" }, { status: 403 })
    }

    let deletedCount = 0

    // if (type === "launches" || type === "both") {
      // const deleteResult = await prisma.launch.deleteMany({
      //   where: {
      //     congregationId: { in: congregationIds },
      //     date: {
      //       gte: new Date(startDate),
      //       lte: new Date(endDate)
      //     }
      //   }
      // })

      // deletedCount += deleteResult.count
    // }

    // if (type === "contributors" || type === "both") {
      // Construir filtro de status baseado na seleção do usuário
      const where: any = {
        congregationId: { in: congregationIds },
        date: {
          gte: launchDateStart,
          lte: launchDateEnd
        },
        type: { in: type },
        OR: [
          { status: "CANCELED" },
          { status: "EXPORTED" }
        ]
      }

      // Filtrar por status de importação se especificado
      if (launchStatus === 'IMPORTED') {
        where.AND = [
          {
            OR: [
              { status: "CANCELED" },
              { status: "EXPORTED" }
            ]
          },
          { status: "IMPORTED" }
        ]
        delete where.OR
      } else if (launchStatus === 'MANUAL') {
        where.AND = [
          {
            OR: [
              { status: "CANCELED" },
              { status: "EXPORTED" }
            ]
          },
          { status: { not: "IMPORTED" } }
        ]
        delete where.OR
      }

      const deleteResult = await prisma.launch.deleteMany({
        where
      })

      deletedCount += deleteResult.count
    // }

    return NextResponse.json({ 
      message: `${deletedCount} registros excluídos com sucesso`,
      deletedCount 
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir histórico" }, { status: 500 })
  }
}