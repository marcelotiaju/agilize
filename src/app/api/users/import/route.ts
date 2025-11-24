import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import{ authOptions }from "../../auth/[...nextauth]/route";
import bcrypt from "bcrypt"

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
        errors.push(`Linha ${i + 2}: Formato inválido - esperado nome,email,cpf...`)
        continue
      }

      const [usulogin,usunome,senha,email,celular,dtvalidadeinicio,dtvalidadefim,diashistorico,Paginainicial,
            profileId
            // Lancar_entrada,Lancar_dizimo,Lancar_saida,Aprovar_entrada,Aprovar_dizimo,Aprovar_saida,
            // Lancar_missao,Lancar_circulo,Aprovar_missao,Aprovar_circulo,
            // Cadastro_incluir,Cadastro_Edita,Cadastro_Excluir,Dados_Exportacao,Dados_Exclusao
          ] = columns

      if (!usulogin || !usunome || !email || !dtvalidadeinicio || !dtvalidadefim) {
        errors.push(`Linha ${i + 2}: nome,email,cpf,validade_inicio,validade_fim são obrigatórios`)
        continue
      }

      try {
        // Verifica se já existe um usuario com este código
        const existing = await prisma.user.findUnique({
          where: { cpf: usulogin.toString() }
        })

        if (existing) {
          errors.push(`Linha ${i + 2}: Usuário ${usulogin} já existe`)
          continue
        }

        // Criptografar senha
        const hashedPassword = await bcrypt.hash(senha, 12)

        const stringToBoolean = (value: string | undefined): boolean => {
        // Retorna true se a string for '1', e false para qualquer outra coisa (incluindo '0' e undefined)
        return value === '1';
        };

        // Cria a novo usuario
        await prisma.user.create({
          data: {
            cpf: usulogin.toString(),
            name: usunome,
            password: hashedPassword,
            email,
            phone: celular,
            validFrom: new Date(dtvalidadeinicio),
            validTo: new Date(dtvalidadefim),
            historyDays: parseInt(diashistorico),
            defaultPage: `/${Paginainicial}`,
            profileId: profileId,
            // canLaunchEntry: stringToBoolean(Lancar_entrada),
            // canLaunchTithe: stringToBoolean(Lancar_dizimo),
            // canLaunchExpense: stringToBoolean(Lancar_saida),
            // canLaunchMission: stringToBoolean(Lancar_missao),
            // canLaunchCircle: stringToBoolean(Lancar_circulo),
            // canApproveMission: stringToBoolean(Aprovar_missao),
            // canApproveCircle: stringToBoolean(Aprovar_circulo),
            // canApproveEntry: stringToBoolean(Aprovar_entrada),
            // canApproveTithe: stringToBoolean(Aprovar_dizimo),
            // canApproveExpense: stringToBoolean(Aprovar_saida),
            // canCreate: stringToBoolean(Cadastro_incluir),
            // canEdit: stringToBoolean(Cadastro_Edita),
            // canExclude: stringToBoolean(Cadastro_Excluir),
            // canExport: stringToBoolean(Dados_Exportacao),
            // canDelete: stringToBoolean(Dados_Exclusao),
          }
        })

        imported++
      } catch (error) {
        errors.push(`Linha ${i + 2}: Erro ao criar usuário - ${error.message}`)
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
