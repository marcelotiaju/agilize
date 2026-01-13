import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";

export async function PUT(request: NextRequest, props: any) {
    const session = await getServerSession(authOptions);
  
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  
    try {
      const params = await props.params;
      const id = params.id;
      const body = await request.json();
      const { status, approvedBy, approvedAt,approvedByTreasury,approvedByAccountant,approvedByDirector,cancelledBy,cancelledAt } = body;
      
      // Verifique se o lançamento existe
      const existingLaunch = await prisma.launch.findUnique({
        where: { id },
        select: { type: true, status: true }
      });

      if (!existingLaunch) {
        return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
      }

      // Não pode alterar lançamento já exportado
      if (existingLaunch.status === "EXPORTED") {
        return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
      }

      // Não pode reverter um lançamento cancelado
      if (existingLaunch.status === "CANCELED" && status === "NORMAL") {
        return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 });
      }

      // Verificar permissões de aprovação conforme o tipo
      if (status === "APPROVED") {
        if (existingLaunch.type === "VOTO" && !session.user.canApproveEntry) {
          return NextResponse.json({ error: "Sem permissão para aprovar votos" }, { status: 403 });
        }
        if (existingLaunch.type === "EBD" && !session.user.canApproveEntry) {
          return NextResponse.json({ error: "Sem permissão para aprovar EBD" }, { status: 403 });
        }
        if (existingLaunch.type === "CAMPANHA" && !session.user.canApproveEntry) {
          return NextResponse.json({ error: "Sem permissão para aprovar campanhas" }, { status: 403 });
        }
        if (existingLaunch.type === "DIZIMO" && !session.user.canApproveTithe) {
          return NextResponse.json({ error: "Sem permissão para aprovar dízimos" }, { status: 403 });
        }
        if (existingLaunch.type === "SAIDA" && !session.user.canApproveExpense) {
          return NextResponse.json({ error: "Sem permissão para aprovar saídas" }, { status: 403 });
        }
        if (existingLaunch.type === "MISSAO" && !session.user.canApproveMission) {
          return NextResponse.json({ error: "Sem permissão para aprovar missões" }, { status: 403 });
        }
        if (existingLaunch.type === "CIRCULO" && !session.user.canApproveCircle) {
          return NextResponse.json({ error: "Sem permissão para aprovar círculos" }, { status: 403 });
        }
        if (existingLaunch.type === "OFERTA_CULTO" && !session.user.canApproveServiceOffer) {
          return NextResponse.json({ error: "Sem permissão para aprovar ofertas" }, { status: 403 });
        }
        if (existingLaunch.type === "CARNE_REVIVER" && !session.user.canApproveServiceOffer) {
          return NextResponse.json({ error: "Sem permissão para aprovar Carnê Reviver" }, { status: 403 });
        }
      }

      const updateData: any = { status }
      
      // Se aprovando, adicionar informações de aprovação
      if (status === "APPROVED" && approvedBy && approvedAt) {
        if (approvedByTreasury) {
          updateData.approvedByTreasury = approvedBy
          updateData.approvedAtTreasury = new Date(approvedAt)
        }
        if (approvedByAccountant) {
          updateData.approvedByAccountant = approvedBy
          updateData.approvedAtAccountant = new Date(approvedAt)
        }
        if (approvedByDirector) {
          updateData.approvedByDirector = approvedBy
          updateData.approvedAtDirector = new Date(approvedAt)
        }
        // Identificar método de aprovação: via grid (não tem summaryId)
        if (!existingLaunch.summaryId) {
          updateData.approvedVia = 'GRID'
        }
      }
      
      // Se desaprovando (voltando para NORMAL), limpar informações de aprovação
      if (status === "NORMAL") {
          updateData.approvedByTreasury = null
          updateData.approvedAtTreasury = null
          updateData.approvedByAccountant = null
          updateData.approvedAtAccountant = null
          updateData.approvedByDirector = null
          updateData.approvedAtDirector = null
      }


      if (status === "CANCELED") {
          updateData.cancelledBy = cancelledBy
          updateData.cancelledAt = new Date(cancelledAt)
      }
      const updatedLaunch = await prisma.launch.update({
        where: { id },
        data: updateData
      })
      
      return NextResponse.json(updatedLaunch)
    } catch (error) {
      console.error("Erro ao atualizar status do lançamento:", error)
      return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
    }
  }