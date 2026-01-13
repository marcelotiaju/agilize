import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"
import { zonedTimeToUtc, startOfDay } from "date-fns-tz"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // Verificar permissões para importar lançamentos
  if (!session.user.canLaunchTithe && !session.user.canLaunchCarneReviver) {
    return NextResponse.json({ error: "Sem permissão para importar lançamentos" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const launchType = formData.get('launchType') as string // 'DIZIMO' ou 'CARNE_REVIVER'
    const congregationId = formData.get('congregationId') as string

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    if (!launchType || (launchType !== 'DIZIMO' && launchType !== 'CARNE_REVIVER')) {
      return NextResponse.json({ error: "Tipo de lançamento inválido. Deve ser DIZIMO ou CARNE_REVIVER" }, { status: 400 })
    }

    if (!congregationId) {
      return NextResponse.json({ error: "Congregação não informada" }, { status: 400 })
    }

    // Verificar permissão para o tipo específico
    if (launchType === 'DIZIMO' && !session.user.canLaunchTithe) {
      return NextResponse.json({ error: "Sem permissão para importar lançamentos do tipo Dízimo" }, { status: 403 })
    }

    if (launchType === 'CARNE_REVIVER' && !session.user.canLaunchCarneReviver) {
      return NextResponse.json({ error: "Sem permissão para importar lançamentos do tipo Carnê Reviver" }, { status: 403 })
    }

    // Verificar acesso à congregação
    const userCongregation = await prisma.userCongregation.findFirst({
      where: { userId: session.user.id, congregationId }
    })

    if (!userCongregation) {
      return NextResponse.json({ error: "Acesso não autorizado a esta congregação" }, { status: 403 })
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: "Arquivo deve ser CSV" }, { status: 400 })
    }

    // Ler o arquivo
    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder('iso-8859-1')
    const text = decoder.decode(buffer)

    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados" }, { status: 400 })
    }

    // Formato esperado do CSV:
    // Data,Valor,Contribuinte,Descrição,Nr Recibo
    // ou
    // Data,Valor,Contribuinte,Descrição
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const dataLines = lines.slice(1)
    
    let imported = 0
    let errors: string[] = []
    const timezone = 'America/Sao_Paulo'

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      const columns = line.split(',').map(col => col.trim())
      
      if (columns.length < 3) {
        errors.push(`Linha ${i + 2}: Formato inválido - esperado pelo menos Data,Valor,Contribuinte`)
        continue
      }

      // Tentar identificar colunas por posição ou nome
      let dateStr = ''
      let valueStr = ''
      let contributorName = ''
      let description = ''
      let talonNumber = ''

      // Se tiver cabeçalho, tentar identificar por nome
      if (headers.length > 0) {
        const dateIdx = headers.findIndex(h => h.includes('data'))
        const valueIdx = headers.findIndex(h => h.includes('valor'))
        const contributorIdx = headers.findIndex(h => h.includes('contribuinte') || h.includes('nome'))
        const descIdx = headers.findIndex(h => h.includes('descrição') || h.includes('descricao'))
        const talonIdx = headers.findIndex(h => h.includes('recibo') || h.includes('talão') || h.includes('talao') || h.includes('nr'))

        dateStr = dateIdx >= 0 && columns[dateIdx] ? columns[dateIdx] : columns[0]
        valueStr = valueIdx >= 0 && columns[valueIdx] ? columns[valueIdx] : columns[1]
        contributorName = contributorIdx >= 0 && columns[contributorIdx] ? columns[contributorIdx] : columns[2]
        description = descIdx >= 0 && columns[descIdx] ? columns[descIdx] : (columns[3] || '')
        talonNumber = talonIdx >= 0 && columns[talonIdx] ? columns[talonIdx] : (columns[4] || '')
      } else {
        // Sem cabeçalho, usar posição fixa
        dateStr = columns[0] || ''
        valueStr = columns[1] || ''
        contributorName = columns[2] || ''
        description = columns[3] || ''
        talonNumber = columns[4] || ''
      }

      if (!dateStr || !valueStr || !contributorName) {
        errors.push(`Linha ${i + 2}: Data, Valor e Contribuinte são obrigatórios`)
        continue
      }

      // Parse da data (aceitar formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
      let launchDate: Date
      try {
        const dateParts = dateStr.split(/[\/\-]/)
        if (dateParts.length === 3) {
          if (dateParts[2].length === 4) {
            // Formato DD/MM/YYYY ou DD-MM-YYYY
            const day = parseInt(dateParts[0])
            const month = parseInt(dateParts[1]) - 1
            const year = parseInt(dateParts[2])
            launchDate = new Date(year, month, day)
          } else {
            // Formato YYYY-MM-DD
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

        // Converter para UTC
        const startOfDayLocal = startOfDay(launchDate)
        launchDate = zonedTimeToUtc(startOfDayLocal, timezone)
      } catch (error) {
        errors.push(`Linha ${i + 2}: Data inválida: ${dateStr}`)
        continue
      }

      // Parse do valor
      let value: number
      try {
        // Remover R$ e espaços, substituir vírgula por ponto
        const cleanValue = valueStr.replace(/[R$\s]/g, '').replace(',', '.')
        value = parseFloat(cleanValue)
        if (isNaN(value) || value <= 0) {
          throw new Error('Valor inválido')
        }
      } catch (error) {
        errors.push(`Linha ${i + 2}: Valor inválido: ${valueStr}`)
        continue
      }

      // Normalizar nome do contribuinte (maiúsculas)
      contributorName = contributorName.toUpperCase().trim()
      if (!contributorName) {
        errors.push(`Linha ${i + 2}: Nome do contribuinte não pode estar vazio`)
        continue
      }

      // Tentar encontrar contribuinte cadastrado pelo nome
      let contributorId: string | null = null
      const contributor = await prisma.contributor.findFirst({
        where: {
          congregationId,
          name: { equals: contributorName, mode: 'insensitive' }
        }
      })

      if (contributor) {
        contributorId = contributor.id
      }

      try {
        await prisma.launch.create({
          data: {
            congregationId,
            type: launchType,
            date: launchDate,
            value,
            contributorName: contributorId ? null : contributorName,
            contributorId: contributorId || null,
            description: description || null,
            talonNumber: talonNumber || null,
            status: 'IMPORTED',
            createdBy: session.user?.name || 'Sistema'
          }
        })
        imported++
      } catch (error: any) {
        errors.push(`Linha ${i + 2}: Erro ao criar lançamento - ${error.message}`)
      }
    }

    if (errors.length > 0 && imported === 0) {
      return NextResponse.json({ 
        error: "Erro na importação", 
        details: errors,
        imported: 0
      }, { status: 400 })
    }

    return NextResponse.json({ 
      message: imported > 0 ? "Importação concluída com sucesso" : "Nenhum lançamento importado",
      imported,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Erro na importação CSV:', error)
    return NextResponse.json({ error: "Erro interno do servidor: " + error.message }, { status: 500 })
  }
}
