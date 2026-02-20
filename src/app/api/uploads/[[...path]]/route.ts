import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

/**
 * Serve uploaded files (anexos) via API.
 * Em produção (ex.: Vercel/serverless), o filesystem é efêmero: arquivos em public/uploads
 * podem não existir após o deploy. Opções:
 * 1) Usar volume persistente no servidor onde a aplicação roda.
 * 2) Configurar storage externo (S3, etc.) e definir UPLOAD_BASE_URL para URLs absolutas.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  if (pathSegments.length === 0) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  // Evitar path traversal
  const safePath = pathSegments.join("/").replace(/\.\./g, "");
  if (safePath !== pathSegments.join("/")) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  const filePath = join(UPLOADS_DIR, safePath);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = pathSegments[pathSegments.length - 1]?.split(".").pop() ?? "";
    const mime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
    };
    const contentType = mime[ext.toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Erro ao servir upload:", err);
    return NextResponse.json(
      { error: "Erro ao carregar arquivo" },
      { status: 500 }
    );
  }
}
