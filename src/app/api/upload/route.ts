
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;
        const type = data.get("type") as string; // 'user' | 'document'

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
        }

        // Validar tamanho do arquivo (2MB = 2,097,152 bytes)
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
        console.log(`Upload attempt - File: ${file.name}, Size: ${file.size} bytes, Max: ${MAX_FILE_SIZE} bytes`);

        if (file.size > MAX_FILE_SIZE) {
            console.log(`File rejected - Size ${file.size} exceeds maximum ${MAX_FILE_SIZE}`);
            return NextResponse.json({
                error: "O arquivo excede o tamanho máximo permitido de 2MB"
            }, { status: 400 });
        }

        if (!type || !['user', 'document'].includes(type)) {
            console.log(`Invalid type: ${type}`);
            return NextResponse.json({ error: "Tipo de upload inválido" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Definir pasta de destino
        const subfolder = type === 'user' ? 'usuarios' : 'documentos';
        const uploadDir = join(process.cwd(), "public", "uploads", subfolder);

        // Garantir que a pasta existe
        await mkdir(uploadDir, { recursive: true });

        // Gerar nome único para o arquivo
        // Manter a extensão original se possível, senão usar .jpg (assumindo imagem/foto)
        const originalName = file.name;
        const extension = originalName.split('.').pop() || 'jpg';
        const fileName = `${uuidv4()}.${extension}`;
        const filePath = join(uploadDir, fileName);

        // Salvar arquivo
        await writeFile(filePath, buffer);

        // Retornar URL pública
        const publicUrl = `/uploads/${subfolder}/${fileName}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error("Erro ao fazer upload:", error);
        return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 });
    }
}
