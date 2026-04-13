import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    try {
        const prisma = await getDb(request)
        const config = await prisma.bankIntegrationConfig.findUnique({
            where: { id },
            include: {
                sourceColumns: true,
                destinationColumns: true,
                launchIntegrationRules: true
            }
        })

        if (!config) return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 })

        return NextResponse.json(config)
    } catch (error) {
        console.error("Erro ao buscar configuração de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        const body = await request.json()
        const {
            name,
            financialEntityId,
            paymentMethodId,
            accountPlan,
            launchType,
            launchTypeSource,
            congregationSource,
            sourceColumns,
            destinationColumns,
            launchIntegrationRules,
            filters
        } = body
        
        console.log('📥 Recebido launchIntegrationRules:', JSON.stringify(launchIntegrationRules, null, 2))

        // Transaction to update config and columns
        const updatedConfig = await prisma.$transaction(async (tx) => {
            // Delete existing columns to recreate them (simpler than syncing)
            await tx.sourceFileColumn.deleteMany({ where: { configId: id } })
            await tx.destinationFileColumn.deleteMany({ where: { configId: id } })
            await tx.launchIntegrationRule.deleteMany({ where: { configId: id } })

            // Filter launch rules to only include those with non-empty code and remove duplicates
            const validRules = Array.from(
                new Map(
                    (launchIntegrationRules || [])
                        .filter((rule: any) => rule.code && rule.code.trim())
                        .map((rule: any) => [rule.code, rule])
                ).values()
            )
            
            console.log('✅ Valid rules after filtering:', validRules.length)
            
            const rulesToCreate = validRules.map((rule: any) => ({
                code: rule.code,
                name: rule.name,
                transformation: rule.transformation
                    ? (typeof rule.transformation === 'string'
                        ? JSON.parse(rule.transformation)
                        : rule.transformation)
                    : null
            }))
            
            console.log('📝 Rules to create:', JSON.stringify(rulesToCreate, null, 2))

            return tx.bankIntegrationConfig.update({
                where: { id },
                data: {
                    name,
                    financialEntityId: Number(financialEntityId),
                    paymentMethodId: Number(paymentMethodId),
                    accountPlan,
                    launchType,
                    launchTypeSource: launchTypeSource || "FIXED",
                    congregationSource: congregationSource || "FIXED",
                    filters: filters || [],
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
                    },
                    launchIntegrationRules: {
                        create: rulesToCreate
                    }
                },
                include: {
                    sourceColumns: true,
                    destinationColumns: true,
                    launchIntegrationRules: true
                }
            })
        })

        console.log('💾 Saved launchIntegrationRules:', JSON.stringify(updatedConfig.launchIntegrationRules, null, 2))

        return NextResponse.json(updatedConfig)
    } catch (error) {
        console.error("Erro ao atualizar configuração de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        const prisma = await getDb(request)
        await prisma.bankIntegrationConfig.delete({
            where: { id }
        })
        return NextResponse.json({ message: "Configuração excluída com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir configuração de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
