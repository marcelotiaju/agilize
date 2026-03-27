import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
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
        const config = await prisma.bankIntegrationConfig.findUnique({
            where: { id },
            include: {
                sourceColumns: true,
                destinationColumns: true
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
            destinationColumns
        } = body

        // Transaction to update config and columns
        const updatedConfig = await prisma.$transaction(async (tx) => {
            // Delete existing columns to recreate them (simpler than syncing)
            await tx.sourceFileColumn.deleteMany({ where: { configId: id } })
            await tx.destinationFileColumn.deleteMany({ where: { configId: id } })

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
        })

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
        await prisma.bankIntegrationConfig.delete({
            where: { id }
        })
        return NextResponse.json({ message: "Configuração excluída com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir configuração de integração:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
