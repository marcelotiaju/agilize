import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getDb } from "@/lib/getDb"
import { authOptions } from "../../auth/[...nextauth]/route"
import { zonedTimeToUtc } from "date-fns-tz"
import { startOfDay } from "date-fns"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!session.user.canLaunchTithe && !session.user.canLaunchCarneReviver) {
    return NextResponse.json({ error: "Sem permissão para importar lançamentos" }, { status: 403 })
  }

  const prisma = await getDb(request)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder('iso-8859-1')
    const text = decoder.decode(buffer)

    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados" }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const dataLines = lines.slice(1)

    let imported = 0
    let skipped = 0
    let errorCounts: Record<string, number> = {}
    const timezone = 'America/Sao_Paulo'

    const addError = (msg: string) => {
      errorCounts[msg] = (errorCounts[msg] || 0) + 1
    }

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      const columns = line.split(',').map(col => col.trim())

      if (columns.length < 4) {
        addError(`Formato inválido - esperado pelo menos Congregacao,Data,Valor,Contribuinte`)
        continue
      }

      let congregationCode = ''
      let launchType = ''
      let dateStr = ''
      let talonNumber = ''
      let valueStr = ''
      let temCadastro = ''
      let cpfContributor = ''
      let description = ''

      if (headers.length > 0) {
        const congIdx = headers.findIndex(h => h.includes('congrega') || h.includes('congregação') || h.includes('congregacao'))
        const typeIdx = headers.findIndex(h => h.includes('tipo'))
        const dateIdx = headers.findIndex(h => h.includes('data'))
        const valueIdx = headers.findIndex(h => h.includes('valor'))
        const temCadastroIdx = headers.findIndex(h => h.includes('temcadastro'))
        const contributorIdx = headers.findIndex(h => h.includes('cpfcontribuinte') || h.includes('nome'))
        const descIdx = headers.findIndex(h => h.includes('descrição') || h.includes('descricao'))
        const talonIdx = headers.findIndex(h => h.includes('recibo') || h.includes('talão') || h.includes('talao') || h.includes('numero'))

        congregationCode = congIdx >= 0 && columns[congIdx] ? columns[congIdx] : columns[0]
        launchType = typeIdx >= 0 && columns[typeIdx] ? columns[typeIdx].toUpperCase() : 'DIZIMO'
        dateStr = dateIdx >= 0 && columns[dateIdx] ? columns[dateIdx] : columns[2]
        talonNumber = talonIdx >= 0 && columns[talonIdx] ? columns[talonIdx] : (columns[3] || '')
        valueStr = valueIdx >= 0 && columns[valueIdx] ? columns[valueIdx] : columns[4]
        temCadastro = temCadastroIdx >= 0 && columns[temCadastroIdx] ? columns[temCadastroIdx] : (columns[5] || '')
        cpfContributor = contributorIdx >= 0 && columns[contributorIdx] ? columns[contributorIdx] : columns[6]
        description = descIdx >= 0 && columns[descIdx] ? columns[descIdx] : (columns[7] || '')
      } else {
        congregationCode = columns[0] || ''
        launchType = columns[1] || ''
        dateStr = columns[2] || ''
        talonNumber = columns[3] || ''
        valueStr = columns[4] || ''
        temCadastro = columns[5] || ''
        cpfContributor = columns[6] || ''
        description = columns[7] || ''
      }
      
      if (!congregationCode || !dateStr || !valueStr || !cpfContributor) {
        addError(`Congregacao, Data, Valor e Contribuinte são obrigatórios`)
        continue
      }

      let launchDate: Date
      try {
        const dateParts = dateStr.split(/[\/\-]/)
        if (dateParts.length === 3) {
          if (dateParts[2].length === 4) {
            const day = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1
            const year = parseInt(dateParts[2])
            launchDate = new Date(year, month, day)
          } else {
            const year = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1
            const day = parseInt(dateParts[2])
            launchDate = new Date(year, month, day)
          }
        } else {
          throw new Error('Formato de data inválido')
        }

        if (isNaN(launchDate.getTime())) {
          throw new Error('Data inválida')
        }

        const startOfDayLocal = startOfDay(launchDate)
        launchDate = zonedTimeToUtc(startOfDayLocal, timezone)
      } catch (error) {
        addError(`Data inválida`)
        continue
      }

      let value: number
      try {
        const cleanValue = valueStr.replace(/[R$\s]/g, '').replace(',', '.')
        value = parseFloat(cleanValue)
        if (isNaN(value) || value <= 0) {
          throw new Error('Valor inválido')
        }
      } catch (error) {
        addError(`Valor inválido`)
        continue
      }

      const congregation = await prisma.congregation.findUnique({
        where: { code: congregationCode }, select: { id: true }
      })

      if (!congregation) {
        addError(`Congregação com código '${congregationCode}' não encontrada`)
        continue
      }

      const contributor = await prisma.contributor.findFirst({
        where: { cpf: cpfContributor || null }, select: { id: true, name: true }
      })

      try {
        const existingLaunch = await prisma.launch.findFirst({
          where: {
            congregationId: congregation?.id || null,
            type: launchType as any,
            date: launchDate,
            value: value,
            contributorId: contributor?.id || null,
            status: 'IMPORTED'
          }
        })

        if (existingLaunch) {
          skipped++
          continue
        }

        await prisma.launch.create({
          data: {
            congregationId: congregation?.id || null,
            type: launchType,
            date: launchDate,
            value,
            contributorName: contributor?.name || (temCadastro.toLowerCase() === 'n' ? cpfContributor : ''),
            contributorId: contributor?.id || null,
            description: description || null,
            talonNumber: talonNumber || null,
            status: 'IMPORTED',
            createdBy: session.user?.name || 'Sistema'
          }
        })
        imported++
      } catch (error: any) {
        addError(`Erro ao criar lançamento - ${error.message}`)
      }
    }

    const consolidatedErrors = Object.entries(errorCounts).map(([msg, count]) => {
      return count > 1 ? `${msg} (${count} linhas)` : msg
    })

    if (consolidatedErrors.length > 0 && imported === 0) {
      return NextResponse.json({
        error: skipped > 0 ? "Nenhum novo lançamento importado (duplicados detectados)" : "Erro na importação",
        details: consolidatedErrors,
        imported: 0,
        skipped
      }, { status: 400 })
    }

    return NextResponse.json({
      message: imported > 0 ? "Importação concluída com sucesso" : "Processamento concluído",
      imported,
      skipped,
      errors: consolidatedErrors.length > 0 ? consolidatedErrors : undefined
    })
  } catch (error: any) {
    console.error('Erro na importação CSV:', error)
    return NextResponse.json({ error: "Erro interno do servidor: " + error.message }, { status: 500 })
  }
}
