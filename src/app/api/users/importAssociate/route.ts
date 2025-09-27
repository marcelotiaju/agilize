import { NextRequest, NextResponse, userAgent } from "next/server"
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
      
      if (columns.length < 1) {
        errors.push(`Linha ${i + 2}: Formato inválido`)
        continue
      }

      const [usulogin,codCongregacao] = columns

      if (!usulogin || !codCongregacao ) {
        errors.push(`Linha ${i + 2}: usulogin,codcongregacao são obrigatórios`)
        continue
      }

      try {
        // Verifica se já existe um usuario com este código
        const usuario = await prisma.user.findUnique({
          where: { cpf: usulogin.toString() },
          select: {
            id: true
          }
        })

        const congregacao = await prisma.congregation.findUnique({
          where: { code: codCongregacao.toString() },
          select: {
            id: true
          }
        })
        // const usuario_congregacao = await prisma.userCongregation.findUnique({
        //     where: { 
        //         userId: usuario?.id, 
        //         congregationId: congregacao?.id 
        //     },
        //     select: {
        //         userId: true,
        //         congregationId: true
        //     }
        // })
        
        // console.log(usuario_congregacao)
        // if (usuario_congregacao) {
        //   errors.push(`Linha ${i + 2}: Usuário ${usulogin} já associado`)
        //   continue
        // }

        // Associa novo usuario
        await prisma.userCongregation.create({
          data: {
            userId: usuario?.id,
            congregationId: congregacao?.id
          }
        })

        imported++
      } catch (error) {
        errors.push(`Linha ${i + 2}: Erro ao criar usuário - ${error.message}`)
      }
    }
    console.log(errors)
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
