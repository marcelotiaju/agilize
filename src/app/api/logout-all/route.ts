import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient, getAllDbAliases } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        }

        const aliases = getAllDbAliases()
        const results: { alias: string; status: string; count?: number; error?: string }[] = []
        const now = new Date()

        for (const alias of aliases) {
            try {
                const prisma = getPrismaClient(alias)
                const updateResult = await prisma.user.updateMany({
                    data: {
                        forceLogoutAt: now
                    }
                })
                results.push({ alias, status: "success", count: updateResult.count })
                console.log(`[${now.toISOString()}] Usuários deslogados na base ${alias} via forceLogoutAt (count: ${updateResult.count})`)
            } catch (error: any) {
                console.error(`Erro ao deslogar usuários na base ${alias}:`, error)
                results.push({ alias, status: "error", error: error.message || String(error) })
            }
        }

        const hasError = results.some(r => r.status === "error")

        return NextResponse.json(
            {
                message: "Logout executado em todas as bases",
                results
            },
            { status: hasError ? 207 : 200 }
        )
    } catch (error) {
        console.error("Erro ao deslogar todos os usuários:", error)
        return NextResponse.json({ error: "Erro ao deslogar usuários" }, { status: 500 })
    }
}
