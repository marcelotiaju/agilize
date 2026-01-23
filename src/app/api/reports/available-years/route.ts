import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
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
    return NextResponse.json({ error: "Erro ao buscar anos" }, { status: 500 })
  }
}