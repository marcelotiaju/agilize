import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import{ authOptions }from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

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
