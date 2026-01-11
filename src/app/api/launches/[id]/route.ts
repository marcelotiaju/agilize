import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function PUT(request: NextRequest, props: any) {
    const session = await getServerSession(authOptions);
  
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  
    try {
      const params = await props.params; // Await the params Promise
      const id = params.id;
      const body = await request.json();
      //console.log(body)
      // if (body.status !== undefined) {
      //   body.status = body.status;
      // }
      // if (body.approved !== undefined) {
      //   body.approved = body.approved;
      // }

      // Se não houver dados para atualizar, retorne um erro
      // if (Object.keys(updateData).length === 0) {
      //   return NextResponse.json({ error: "Nenhum campo para atualizar foi fornecido" }, { status: 400 })
      // }

      // Verifique se o lançamento já foi exportado
      const existingLaunch = await prisma.launch.findUnique({
          where: { id },
          select: { type: true, status: true }
      });

      if (!existingLaunch) {
          return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
      }

      const launchDate = new Date(`${body.date}T12:00:00Z`)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      launchDate.setHours(0, 0, 0, 0)

      // const launch = await prisma.launch.findUnique({
      //   where: { id },
      //   // include: {
      //   //   congregation: true,
      //     // contributor: true,
      //     // supplier: true
      //   // }
      // })

      // if (!launch) {
      //   return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
      // }
  
      // const userCongregation = await prisma.userCongregation.findFirst({
      //   where: {
      //     userId: session.user.id,
      //     congregationId: launch.congregationId
      //   }
      // })
  
      // if (!userCongregation) {
      //   return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
      // }
  
      if (body.status !== undefined && existingLaunch.status === "EXPORTED") {
        return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
      }
  
      // Verificação para reverter status
      if (body.status === "CANCELED" && body.status === "NORMAL") {
          return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 });
      }

  
      // Verificar permissões de aprovação
      // if (body.approved !== undefined) {
      //     if (body.type === "ENTRADA" && !session.user.canApproveEntry) {
      //         return NextResponse.json({ error: "Sem permissão para aprovar entradas" }, { status: 403 });
      //     }
      //     if (body.type === "DIZIMO" && !session.user.canApproveTithe) {
      //         return NextResponse.json({ error: "Sem permissão para aprovar dízimos" }, { status: 403 });
      //     }
      //     if (body.type === "SAIDA" && !session.user.canApproveExpense) {
      //         return NextResponse.json({ error: "Sem permissão para aprovar saídas" }, { status: 403 });
      //     }
      // }
  
      // const updatedLaunch = await prisma.launch.update({
      //   where: { id },
      //   data: { status }
      // })
  
      //const updateData: any = {}
      // if (status !== undefined) body.status = status
      // if (approved !== undefined) body.approved = approved

      // Preparar dados de atualização
      const dataToUpdate: any = {}
      
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

      // Lógica para contribuinte (Dízimo)
      if (body.type === "DIZIMO" || body.type === "CARNE_REVIVER") {
        if (body.isContributorRegistered && body.contributorId) {
          // Contribuinte cadastrado: salva contributorId e limpa contributorName
          dataToUpdate.contributorId = body.contributorId
          dataToUpdate.contributorName = null
        } else if (body.contributorName !== undefined) {
          // Contribuinte não cadastrado ou anônimo: salva contributorName e limpa contributorId
          dataToUpdate.contributorName = body.contributorName || null
          dataToUpdate.contributorId = null
        }
      } else {
        // Para outros tipos, limpar campos de contribuinte se foram enviados
        if (body.contributorId !== undefined) {
          dataToUpdate.contributorId = null
        }
        if (body.contributorName !== undefined) {
          dataToUpdate.contributorName = null
        }
      }

      // Lógica para fornecedor (Saída)
      if (body.type === "SAIDA") {
        if (body.isSupplierRegistered && body.supplierId) {
          // Fornecedor cadastrado: salva supplierId e limpa supplierName
          dataToUpdate.supplierId = body.supplierId
          dataToUpdate.supplierName = null
        } else if (body.supplierName !== undefined) {
          // Fornecedor não cadastrado: salva supplierName e limpa supplierId
          dataToUpdate.supplierName = body.supplierName || null
          dataToUpdate.supplierId = null
        }
      } else {
        // Para outros tipos, limpar campos de fornecedor se foram enviados
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
      return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
    }
  }

  export async function DELETE(request: NextRequest, props: any) {
    const session = await getServerSession(authOptions);
  
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  
    try {
        const params = await props.params; // Await the params Promise
      const id = params.id;

      if (!id) {
        return NextResponse.json({ error: "ID do lançamento é obrigatório" }, { status: 400 })
      }
  
      await prisma.launch.delete({
        where: { id }
      })

      return NextResponse.json({ message: "Lançamento excluído com sucesso" })
    } catch (error) {
      return NextResponse.json({ error: "Erro ao excluir lançamento" }, { status: 500 })
    }
  }