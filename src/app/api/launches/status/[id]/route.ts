import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../../auth/[...nextauth]/route";
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
      
      if (body.status !== undefined) {
        body.status = body.status;
      }
      // if (body.approved !== undefined) {
      //   body.approved = body.approved;
      // }

      // Se não houver dados para atualizar, retorne um erro
      if (Object.keys(body).length === 0) {
        return NextResponse.json({ error: "Nenhum campo para atualizar foi fornecido" }, { status: 400 })
      }

      // Verifique se o lançamento já foi exportado
      const existingLaunch = await prisma.launch.findUnique({
          where: { id },
          select: { type: true, status: true }
      });

      if (!existingLaunch) {
          return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
      }

 
      if (body.status !== undefined && existingLaunch.status === "EXPORTED") {
        return NextResponse.json({ error: "Lançamento já exportado não pode ser alterado" }, { status: 400 })
      }
  
      // Verificação para reverter status
      if (body.status === "CANCELED" && body.status === "NORMAL") {
          return NextResponse.json({ error: "Não é possível reverter um lançamento cancelado" }, { status: 400 });
      }

  
      // Verificar permissões de aprovação
      if (body.status === "APPROVED" !== undefined) {
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
            status: body.status,
            // approved: body.approved
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