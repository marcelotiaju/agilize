import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route";
import { unlink } from "fs/promises";
import { join } from "path";
import { getDb } from "@/lib/getDb";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canDelete) {
    return NextResponse.json({ error: "Sem permissão para excluir histórico" }, { status: 403 })
  }

  const prisma = await getDb(request)

  try {
    const body = await request.json()
    const { startDate, endDate, type, congregationIds, launchStatus } = body

    const timezone = 'America/Sao_Paulo';

    // Converte ISO string para Date
    const launchDateStart = new Date(startDate);
    const launchDateEnd = new Date(endDate);

    const userCongregations = await prisma.userCongregation.findMany({
      where: {
        userId: session.user.id,
        congregationId: { in: congregationIds }
      }
    })

    if (userCongregations.length !== congregationIds.length) {
      return NextResponse.json({ error: "Acesso não autorizado a uma ou mais congregações" }, { status: 403 })
    }

    let deletedCount = 0

    const where: any = {
      congregationId: { in: congregationIds },
      date: {
        gte: launchDateStart,
        lte: launchDateEnd
      },
      type: { in: type }
    }

    // Lógica correta de filtragem por status
    if (launchStatus === 'IMPORTED') {
      where.status = "IMPORTED";
    } else if (launchStatus === 'INTEGRATED') {
      where.status = "INTEGRATED";
    } else if (launchStatus === 'MANUAL') {
      where.status = { in: ["CANCELED", "EXPORTED", "NORMAL"] };
    }

    // Buscar os lançamentos antes de excluir para pegar attachmentUrl e summaryId
    const launchesToDelete = await prisma.launch.findMany({
      where,
      select: { id: true, attachmentUrl: true, summaryId: true }
    });

    if (launchesToDelete.length === 0) {
      return NextResponse.json({
        message: `0 registros excluídos com sucesso`,
        deletedCount: 0
      });
    }

    // Excluir arquivos físicos associados
    const filePathsToDelete: string[] = [];
    for (const launch of launchesToDelete) {
      if (launch.attachmentUrl && launch.attachmentUrl.startsWith('/api/uploads/')) {
        const parts = launch.attachmentUrl.split('/api/uploads/');
        if (parts.length === 2) {
          const relativePath = parts[1];
          const physicalPath = join(process.cwd(), 'public', 'uploads', relativePath);
          filePathsToDelete.push(physicalPath);
        }
      }
    }

    for (const physicalPath of filePathsToDelete) {
      try {
        await unlink(physicalPath);
      } catch (err: any) {
        console.error(`Erro ao excluir arquivo físico ${physicalPath}:`, err.message);
      }
    }

    // Coletar summaryIds únicos afetados
    const summaryIds = new Set<string>();
    for (const launch of launchesToDelete) {
      if (launch.summaryId) {
        summaryIds.add(launch.summaryId);
      }
    }

    // Excluir os lançamentos do banco
    const deleteResult = await prisma.launch.deleteMany({
      where
    })

    deletedCount += deleteResult.count

    // Verificar e excluir resumos que ficaram sem lançamentos vinculados
    if (summaryIds.size > 0) {
      for (const summaryId of summaryIds) {
        const remainingLaunches = await prisma.launch.count({
          where: { summaryId }
        });

        if (remainingLaunches === 0) {
          try {
            await prisma.congregationSummary.delete({
              where: { id: summaryId }
            });
          } catch (err: any) {
            console.error(`Erro ao excluir resumo vazio ${summaryId}:`, err.message);
          }
        }
      }
    }
    // }

    return NextResponse.json({
      message: `${deletedCount} registros excluídos com sucesso`,
      deletedCount
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir histórico" }, { status: 500 })
  }
}