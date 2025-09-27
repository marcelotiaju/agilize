import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {


    const congregations = await prisma.congregation.findMany({
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(congregations)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar congregações" }, { status: 500 })
  }
}
