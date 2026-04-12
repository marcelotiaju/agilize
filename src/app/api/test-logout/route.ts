import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"

export async function GET(request: NextRequest) {

  const prisma = await getDb(request)    
    try {
        // Update all users with current timestamp as logout time
        await prisma.user.updateMany({
            data: {
                forceLogoutAt: new Date()
            }
        })

        console.log(`[${new Date().toISOString()}] TEST: Todos os usuários foram deslogados via forceLogoutAt`)

        return NextResponse.json({ message: "TEST: Todos os usuários foram marcados para logout" })
    } catch (error) {
        console.error("Erro ao deslogar todos os usuários no teste:", error)
        return NextResponse.json({ error: "Erro ao deslogar usuários" }, { status: 500 })
    }
}
