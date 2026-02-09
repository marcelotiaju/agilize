import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        // Verificar se a requisição tem um token de autorização
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        }

        // Update all users with current timestamp as logout time
        await prisma.user.updateMany({
            data: {
                forceLogoutAt: new Date()
            }
        })

        console.log(`[${new Date().toISOString()}] Todos os usuários foram deslogados via forceLogoutAt`)

        return NextResponse.json({ message: "Todos os usuários foram marcados para logout" })
    } catch (error) {
        console.error("Erro ao deslogar todos os usuários:", error)
        return NextResponse.json({ error: "Erro ao deslogar usuários" }, { status: 500 })
    }
}