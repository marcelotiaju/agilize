import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { authOptions } from "../../auth/[...nextauth]/route"
import { getServerSession } from "next-auth"
import fs from "fs"
import path from "path"

export async function PUT(request: NextRequest, props: any) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const params = await props.params
    const id = params.id
    const body = await request.json()

    const existingLaunch = await prisma.launch.findUnique({
      where: { id },
      select: { type: true, status: true, isIntegrated: true, summaryId: true }
    })

    if (!existingLaunch) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
    }

    const canTechnicalIntervention = session.user.canTechnicalIntervention

    if (existingLaunch.isIntegrated && !canTechnicalIntervention) {
      return NextResponse.json({ error: "Lançamento de integração bancária não pode ser alterado diretamente. Use Intervenção Técnica." }, { status: 400 })
    }
    
    if (existingLaunch.summaryId && !canTechnicalIntervention) {
        return NextResponse.json({ error: "Lançamento faz parte de um resumo aprovado e não pode ser alterado" }, { status: 400 })
    }

    const launchDate = new Date(`${body.date}T12:00:00Z`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    launchDate.setHours(0, 0, 0, 0)

    if (!canTechnicalIntervention) {
      if (body.status !== undefined && existingLaunch.status === "EXPORTED") {
        return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
      }

      if (body.status === "CANCELED" && body.status === "NORMAL") {
        return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 })
      }
    }

    const dataToUpdate: any = {}

    if (body.status !== undefined && (canTechnicalIntervention || body.status === 'CANCELED')) {
      dataToUpdate.status = body.status
    }

    if (body.value !== undefined) {
      dataToUpdate.value = body.value ? parseFloat(body.value) : null
    }
    if (body.congregationId !== undefined) {
      dataToUpdate.congregationId = body.congregationId || null
    }
    if (body.talonNumber !== undefined) {
      dataToUpdate.talonNumber = body.talonNumber || null
    }
    if (body.classificationId !== undefined) {
      dataToUpdate.classificationId = body.classificationId || null
    }
    if (body.date !== undefined && body.date !== null && body.date !== '') {
      dataToUpdate.date = launchDate
    }
    if (body.type !== undefined) {
      dataToUpdate.type = body.type
    }
    if (body.description !== undefined) {
      dataToUpdate.description = body.description
    }
    if (body.attachmentUrl !== undefined) {
      dataToUpdate.attachmentUrl = body.attachmentUrl
    }
    if (body.isRateio !== undefined) {
      dataToUpdate.isRateio = !!body.isRateio
    }

    if (body.type === "DIZIMO" || body.type === "CARNE_REVIVER") {
      if (body.isContributorRegistered && body.contributorId) {
        dataToUpdate.contributorId = body.contributorId
        dataToUpdate.contributorName = null
      } else if (body.contributorName !== undefined) {
        dataToUpdate.contributorName = body.contributorName || null
        dataToUpdate.contributorId = null
      }
    } else {
      if (body.contributorId !== undefined) {
        dataToUpdate.contributorId = null
      }
      if (body.contributorName !== undefined) {
        dataToUpdate.contributorName = null
      }
    }

    if (body.type === "SAIDA") {
      if (body.isSupplierRegistered && body.supplierId) {
        dataToUpdate.supplierId = body.supplierId
        dataToUpdate.supplierName = null
      } else if (body.supplierName !== undefined) {
        dataToUpdate.supplierName = body.supplierName || null
        dataToUpdate.supplierId = null
      }
    } else {
      if (body.supplierId !== undefined) {
        dataToUpdate.supplierId = null
      }
      if (body.supplierName !== undefined) {
        dataToUpdate.supplierName = null
      }
    }

    const updatedLaunch = await prisma.launch.update({
      where: { id },
      data: dataToUpdate,
      include: {
        congregation: true,
        contributor: true,
        supplier: true,
        classification: true
      }
    })
    return NextResponse.json(updatedLaunch)
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: any) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const prisma = await getDb(request)

  try {
    const params = await props.params
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "ID do lançamento é obrigatório" }, { status: 400 })
    }

    const existingLaunch = await prisma.launch.findUnique({
      where: { id },
      select: { isIntegrated: true, summaryId: true, integrationBatchId: true, attachmentUrl: true }
    })

    if (!existingLaunch) {
        return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
    }

    if (existingLaunch.summaryId && !session.user.canTechnicalIntervention) {
      return NextResponse.json({ error: "Lançamento faz parte de um resumo e não pode ser excluído diretamente" }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
        if (existingLaunch.isIntegrated) {
            await tx.bankIntegrationRow.updateMany({
                where: { launchId: id },
                data: {
                    isIntegrated: false,
                    launchId: null
                }
            })

            if (existingLaunch.integrationBatchId) {
                await tx.bankIntegrationBatch.update({
                    where: { id: existingLaunch.integrationBatchId },
                    data: { status: 'PENDING' }
                })
            }
        }

        await tx.launch.delete({
            where: { id }
        })
    })

    // Excluir anexo fisicamente se existir
    if (existingLaunch.attachmentUrl) {
      try {
        let relativePath = existingLaunch.attachmentUrl
        if (relativePath.startsWith('/api/uploads/')) {
          relativePath = relativePath.slice('/api/uploads/'.length)
        }
        
        const filePath = path.join(process.cwd(), "public", "uploads", relativePath)
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.log(`Arquivo removido: ${filePath}`)
        }
      } catch (err) {
        console.error("Erro ao remover arquivo físico:", err)
        // Não retornar erro 500 aqui para não impedir a conclusão da exclusão do registro no banco
      }
    }

    return NextResponse.json({ message: "Lançamento excluído com sucesso" })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Erro ao excluir lançamento" }, { status: 500 })
  }
}