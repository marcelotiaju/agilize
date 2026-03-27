import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    try {
        const prisma = await getDb(request)
        const configs = await prisma.bankIntegrationConfig.findMany({
            include: {
                financialEntity: { select: { name: true } },
                paymentMethod: { select: { name: true } },
                sourceColumns: true,
                destinationColumns: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(configs)
    } catch (error) {
        console.error("Erro ao buscar configurações de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const body = await request.json()
        const {
            code,
            name,
            financialEntityId,
            paymentMethodId,
            accountPlan,
            launchType,
            launchTypeSource,
            congregationSource,
            sourceColumns,
            destinationColumns
        } = body

        if (!code || !name || !financialEntityId || !paymentMethodId || !launchType) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
        }

        const existing = await prisma.bankIntegrationConfig.findUnique({ where: { code } })
        if (existing) return NextResponse.json({ error: "Código de layout já existe" }, { status: 400 })

        const config = await prisma.bankIntegrationConfig.create({
            data: {
                code,
                name,
                financialEntityId: Number(financialEntityId),
                paymentMethodId: Number(paymentMethodId),
                accountPlan,
                launchType,
                launchTypeSource: launchTypeSource || "FIXED",
                congregationSource: congregationSource || "FIXED",
                sourceColumns: {
                    create: sourceColumns?.map((col: any) => ({
                        code: col.code,
                        name: col.name
                    })) || []
                },
                destinationColumns: {
                    create: destinationColumns?.map((col: any) => ({
                        code: col.code,
                        name: col.name,
                        transformation: col.transformation
                            ? (typeof col.transformation === 'string'
                                ? col.transformation
                                : JSON.stringify(col.transformation))
                            : null
                    })) || []
                }
            },
            include: {
                sourceColumns: true,
                destinationColumns: true
            }
        })

        return NextResponse.json(config, { status: 201 })
    } catch (error) {
        console.error("Erro ao criar configuração de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
