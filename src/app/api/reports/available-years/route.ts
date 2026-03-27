import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const prisma = await getDb(request)
    
    // Busca as datas de todos os lançamentos (não cancelados)
    const launches = await prisma.launch.findMany({
      where: { status: { not: 'CANCELED' } },
      select: { date: true },
    })

    // Extrai apenas o ano, remove duplicados e ordena do mais recente para o antigo
    const years = Array.from(
      new Set(launches.map(l => new Date(l.date).getUTCFullYear().toString()))
    ).sort((a, b) => b.localeCompare(a))

    return NextResponse.json(years)
  } catch (error) {
    console.error('API: Erro ao buscar anos:', error)
    return NextResponse.json({ error: "Erro ao buscar anos" }, { status: 500 })
  }
}