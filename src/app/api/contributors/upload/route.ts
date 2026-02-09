// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { writeFile } from "fs/promises"
import { join } from "path"
import { mkdir } from "fs/promises"

const UPLOADS_FOLDER = "public/uploads";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Validar tamanho do arquivo (2MB = 2,097,152 bytes)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: "O arquivo excede o tamanho máximo permitido de 2MB"
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Garantir que o diretório de uploads exista
    const uploadDir = join(process.cwd(), UPLOADS_FOLDER)
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }

    // Gerar um nome de arquivo único
    const fileName = `${Date.now()}-${file.name}`
    const path = join(uploadDir, fileName)

    // Salvar o arquivo
    await writeFile(path, buffer)

    // Retornar a URL do arquivo
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error("Erro ao fazer upload:", error)
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 })
  }
}