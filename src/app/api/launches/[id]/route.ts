import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { nextAuthOptions } from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function PUT(request: NextRequest, props: any) {
    const session = await getServerSession(nextAuthOptions);
  
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  
    try {
      const params = await props.params; // Await the params Promise
      const id = params.id;
      const body = await request.json();
      
      if (body.status !== undefined) {
        body.status = body.status;
      }
      if (body.approved !== undefined) {
        body.approved = body.approved;
      }

      // Se não houver dados para atualizar, retorne um erro
      // if (Object.keys(updateData).length === 0) {
      //   return NextResponse.json({ error: "Nenhum campo para atualizar foi fornecido" }, { status: 400 })
      // }

      // Verifique se o lançamento já foi exportado
      const existingLaunch = await prisma.launch.findUnique({
          where: { id },
          select: { exported: true, type: true, status: true }
      });

      if (!existingLaunch) {
          return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
      }

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
  
      if (body.exported) {
        return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
      }
  
      // Verificação para reverter status
      if (body.status === "CANCELED" && body.status === "NORMAL") {
          return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 });
      }

  
      // Verificar permissões de aprovação
      if (body.approved !== undefined) {
          if (body.type === "ENTRADA" && !session.user.canApproveEntry) {
              return NextResponse.json({ error: "Sem permissão para aprovar entradas" }, { status: 403 });
          }
          if (body.type === "DIZIMO" && !session.user.canApproveTithe) {
              return NextResponse.json({ error: "Sem permissão para aprovar dízimos" }, { status: 403 });
          }
          if (body.type === "SAIDA" && !session.user.canApproveExpense) {
              return NextResponse.json({ error: "Sem permissão para aprovar saídas" }, { status: 403 });
          }
      }
  
      // const updatedLaunch = await prisma.launch.update({
      //   where: { id },
      //   data: { status }
      // })
  
      //const updateData: any = {}
      // if (status !== undefined) body.status = status
      // if (approved !== undefined) body.approved = approved

      const updatedLaunch = await prisma.launch.update({
        where: { id },
        data: {
          offerValue: body.offerValue ? parseFloat(body.offerValue) : null,
          votesValue: body.votesValue ? parseFloat(body.votesValue) : null,
          ebdValue: body.ebdValue ? parseFloat(body.ebdValue) : null,
          value: body.value ? parseFloat(body.value) : null,
          supplierId: body.supplierId ? parseInt(body.supplierId) : null,
          contributorId: body.contributorId ? parseInt(body.contributorId) : null,
          talonNumber: body.talonNumber ? body.talonNumber : null,
          classificationId: body.classificationId ? body.classificationId : null,
          date: body.date ? new Date(body.date) : undefined,
          type: body.type ? body.type : undefined,
          description: body.description ? body.description : undefined
        },
        // include: {
        //   congregation: true,
        //    contributor: true,
        //    supplier: true
        // }
      })
      return NextResponse.json(updatedLaunch)
    } catch (error) {
      return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 })
    }
  }