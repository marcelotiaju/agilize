import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: "Arquivo deve ser CSV" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados" }, { status: 400 })
    }

    // Remove o cabeçalho
    const dataLines = lines.slice(1)
    let imported = 0
    let errors = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      const columns = line.split(',').map(col => col.trim())
      
      if (columns.length < 6) {
        errors.push(`Linha ${i + 2}: Formato inválido - esperado codigo,nome,cpf,cargoEclesiástico,CodCongregação, Tipo`)
        continue
      }

      const [code, name, cpf, ecclesiasticalPosition, congregationCode, tipo] = columns

      if (!congregationCode || !code || !name ) {
        errors.push(`Linha ${i + 2}: , codigo, nome e Congregação são obrigatórios`)
        continue
      }

      try {
        // Busca a congribuinte pelo código
        const existing = await prisma.contributor.findUnique({
          where: { code }
        })

        if (existing) {
          errors.push(`Linha ${i + 2}: Código ${code} já existe`)
          continue
        }

       // Cria o novo contribuinte
        await prisma.contributor.create({
          data: {
            code,
            name,
            cpf,
            ecclesiasticalPosition,
            congregationCode,
            tipo: tipo.toUpperCase() === 'CONGREGADO' ? 'CONGREGADO' : 'MEMBRO'
          }
        })

        imported++
      } catch (error) {
        errors.push(`Linha ${i + 2}: Erro ao criar contribuinte - ${error.message}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Erro na importação", 
        details: errors,
        imported 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      message: "Importação concluída com sucesso",
      imported 
    })

  } catch (error) {
    console.error('Erro na importação CSV:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
