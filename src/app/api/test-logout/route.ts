import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient, getAllDbAliases } from "@/lib/prisma"

export async function GET(request: NextRequest) {
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
            console.log(`[${now.toISOString()}] TEST: Usuários deslogados na base ${alias} via forceLogoutAt (count: ${updateResult.count})`)
        } catch (error: any) {
            console.error(`Erro ao deslogar usuários na base ${alias}:`, error)
            results.push({ alias, status: "error", error: error.message || String(error) })
        }
    }

    const hasError = results.some(r => r.status === "error")

    return NextResponse.json(
        {
            message: "TEST: Logout executado em todas as bases",
            results
        },
        { status: hasError ? 207 : 200 }
    )
}
