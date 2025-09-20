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
    const { startDate, endDate, type, congregationIds } = body

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
      const deleteResult = await prisma.launch.deleteMany({
        where: {
          congregationId: { in: congregationIds },
          date: {
            gte: launchDateStart,
            lte: launchDateEnd
          },
          type: { in: type },
          OR: [
            {
              status: "CANCELED"
            },
          ]
        }
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