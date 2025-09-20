import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {

  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: "Arquivo deve ser CSV" }, { status: 400 })
    }

       // 1. Leia o arquivo como um ArrayBuffer
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1'); 
    const text = decoder.decode(buffer);

    //const text = await file.text()
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
      
      if (columns.length < 2) {
        errors.push(`Linha ${i + 2}: Formato inválido - esperado código,nome,nome_regional`)
        continue
      }

      const [code, name, regionalName] = columns

      if (!code || !name) {
        errors.push(`Linha ${i + 2}: Código e nome são obrigatórios`)
        continue
      }

      try {
        // Verifica se já existe uma congregação com este código
        const existing = await prisma.congregation.findUnique({
          where: { code }
        })

        if (existing) {
          errors.push(`Linha ${i + 2}: Código ${code} já existe`)
          continue
        }

        // Cria a nova congregação
        await prisma.congregation.create({
          data: {
            code,
            name,
            regionalName: regionalName || null
          }
        })

        imported++
      } catch (error) {
        errors.push(`Linha ${i + 2}: Erro ao criar congregação - ${error.message}`)
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
