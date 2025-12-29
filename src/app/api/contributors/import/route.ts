import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../auth/[...nextauth]/route"

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
    let updated = 0
    let created = 0
    let errors = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      const columns = line.split(',').map(col => col.trim())
      
      if (columns.length < 3) {
        errors.push(`Linha ${i + 2}: Formato inválido - esperado codigo,nome,cpf,cargoEclesiástico,CodCongregação,Tipo,Foto`)
        continue
      }

      const [Codigo, Nome, cpf, cargoEclesiástico, Codcongregacao, tipo, Foto] = columns

      if (!Codcongregacao || !Codigo || !Nome ) {
        errors.push(`Linha ${i + 2}: , codigo, nome e Congregação são obrigatórios`)
        continue
      }

      try {
        const congregacaoId = await prisma.congregation.findUnique({
          where: { code: Codcongregacao },
          select: { id: true }
        })

        if (!congregacaoId) {
          errors.push(`Linha ${i + 2}: Congregação com código ${Codcongregacao} não encontrada`)
          continue
        }

        // Verificar se existe contribuinte com o CPF informado
        let existingContributor = null
        if (cpf && cpf.trim()) {
          existingContributor = await prisma.contributor.findFirst({
            where: { cpf: cpf.trim() }
          })
        }

        // Se existe contribuinte com o CPF, atualizar as informações
        if (existingContributor) {
          // Verificar se o código já existe em outro contribuinte (diferente do encontrado pelo CPF)
          const existingByCode = await prisma.contributor.findUnique({
            where: { code: Codigo }
          })

          if (existingByCode && existingByCode.id !== existingContributor.id) {
            errors.push(`Linha ${i + 2}: Código ${Codigo} já existe em outro contribuinte`)
            continue
          }

          // Atualizar o contribuinte existente
          await prisma.contributor.update({
            where: { id: existingContributor.id },
            data: {
              congregationId: congregacaoId.id,
              code: Codigo,
              name: Nome,
              cpf: cpf.trim() || null,
              ecclesiasticalPosition: cargoEclesiástico || null,
              tipo: tipo && tipo.toUpperCase() === 'CONGREGADO' ? 'CONGREGADO' : 'MEMBRO',
              photoUrl: Foto || null
            }
          })
          imported++
          updated++
        } else {
          // Verificar se o código já existe
          const existingByCode = await prisma.contributor.findUnique({
            where: { code: Codigo }
          })

          if (existingByCode) {
            errors.push(`Linha ${i + 2}: Código ${Codigo} já existe`)
            continue
          }

          // Criar novo contribuinte
          await prisma.contributor.create({
            data: {
              congregationId: congregacaoId.id,
              code: Codigo,
              name: Nome,
              cpf: cpf && cpf.trim() ? cpf.trim() : null,
              ecclesiasticalPosition: cargoEclesiástico || null,
              tipo: tipo && tipo.toUpperCase() === 'CONGREGADO' ? 'CONGREGADO' : 'MEMBRO',
              photoUrl: Foto || null
            }
          })
          imported++
          created++
        }
      } catch (error) {
        errors.push(`Linha ${i + 2}: Erro ao processar contribuinte - ${error.message}`)
      }
    }
    console.log(errors)
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Erro na importação", 
        details: errors,
        imported,
        updated,
        created
      }, { status: 400 })
    }

    return NextResponse.json({ 
      message: "Importação concluída com sucesso",
      imported,
      updated,
      created
    })

  } catch (error) {
    console.error('Erro na importação CSV:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
