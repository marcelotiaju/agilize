import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDb } from "@/lib/getDb"
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const prisma = await getDb(request)

  const { searchParams } = new URL(request.url)
  const congregationIds = searchParams.get('congregationIds')?.split(',') || []
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const importFilter = searchParams.get('importFilter') || 'ALL'

  try {
    const validTypes = ['DIZIMO', 'OFERTA_CULTO', 'EBD', 'VOTO', 'CAMPANHA', 'SAIDA']
    const launches = await prisma.launch.findMany({
      where: {
        congregationId: { in: congregationIds },
        type: { in: validTypes },
        date: {
          gte: startOfDay(new Date(startDate)),
          lte: endOfDay(new Date(endDate)),
        },
        status: {
          ...importFilter === 'IMPORTED' ? { equals: 'IMPORTED' } :
            importFilter === 'INTEGRATED' ? { equals: 'INTEGRATED' } :
              importFilter === 'MANUAL' ? { not: { in: ['IMPORTED', 'INTEGRATED', 'CANCELED'] } } :
                { not: 'CANCELED' }
        }
      },
      include: {
        congregation: true,
        contributor: true,
        supplier: true,
        classification: true
      },
      orderBy: [{ date: 'asc' }]
    })

    // Grouping variables
    const taloesMap: Record<string, any> = {}
    const obreirosList: any[] = []
    const saidasList: any[] = []

    let totalTaloesDizimo = 0
    let totalTaloesOferta = 0
    let totalObreiros = 0
    let totalSaidas = 0

    // Process each launch
    for (const _l of launches) {
      const l = _l as any
      if (l.type === 'SAIDA') {
        saidasList.push({
          id: l.id,
          date: l.date,
          talonNumber: l.talonNumber || '-',
          supplierName: l.supplierId ? l.supplier?.name : l.supplierName || 'Diversos',
          classification: l.classification?.description || '-',
          value: Number(l.value) || 0
        })
        totalSaidas += Number(l.value) || 0
      } else if (l.type === 'DIZIMO') {
        const _pos = l.contributor?.ecclesiasticalPosition || 'Membro'
        const isMembro = _pos.toLowerCase() === 'membro' || _pos.toLowerCase() === 'congregado'

        if (isMembro) {
          // Talões
          const mapKey = l.talonNumber || 'S/N'
          if (!taloesMap[mapKey]) {
            taloesMap[mapKey] = { talonNumber: mapKey, date: l.date, dizimo: 0, oferta: 0, total: 0 }
          }
          const val = Number(l.value) || 0
          taloesMap[mapKey].dizimo += val
          taloesMap[mapKey].total += val
          totalTaloesDizimo += val
        } else {
          // Obreiros
          const val = Number(l.value) || 0
          obreirosList.push({
            id: l.id,
            date: l.date,
            talonNumber: l.talonNumber || '-',
            contributorName: l.contributorId ? l.contributor?.name : l.contributorName || '-',
            cargo: _pos,
            value: val
          })
          totalObreiros += val
        }
      } else if (['OFERTA_CULTO', 'EBD', 'VOTO', 'CAMPANHA'].includes(l.type)) {
        // Ofertas -> Talões
        const mapKey = l.talonNumber || 'S/N'
        if (!taloesMap[mapKey]) {
          taloesMap[mapKey] = { talonNumber: mapKey, date: l.date, dizimo: 0, oferta: 0, total: 0 }
        }
        const val = Number(l.value) || 0
        taloesMap[mapKey].oferta += val
        taloesMap[mapKey].total += val
        totalTaloesOferta += val
      }
    }

    // Convert map to sorted array (numeric sorting for talonNumber if possible)
    const taloesArray = Object.values(taloesMap).sort((a: any, b: any) => {
      if (a.talonNumber === 'S/N') return 1;
      if (b.talonNumber === 'S/N') return -1;

      const numA = parseInt(a.talonNumber.replace(/\D/g, ''), 10);
      const numB = parseInt(b.talonNumber.replace(/\D/g, ''), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.talonNumber).localeCompare(String(b.talonNumber));
    })

    const totalTaloes = totalTaloesDizimo + totalTaloesOferta
    const resultado = totalTaloes + totalObreiros - totalSaidas

    return NextResponse.json({
      taloes: taloesArray,
      obreiros: obreirosList,
      saidas: saidasList,
      totals: {
        taloesDizimo: totalTaloesDizimo,
        taloesOferta: totalTaloesOferta,
        taloesTotal: totalTaloes,
        obreirosTotal: totalObreiros,
        saidasTotal: totalSaidas,
        resultado: resultado
      }
    })

  } catch (error) {
    console.error("Erro ao gerar relatório Prestação de Contas:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
