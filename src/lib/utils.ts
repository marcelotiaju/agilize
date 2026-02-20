import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza URL de upload para ser servida via API (/api/uploads/...).
 * Em produção (ex.: serverless), arquivos em public/uploads podem não persistir;
 * servir via API garante o mesmo comportamento entre ambientes.
 */
export function getUploadUrl(url: string | null | undefined): string {
  if (!url) return ""
  const normalized = url.startsWith("/") ? url : `/${url}`
  if (normalized.startsWith("/uploads/")) {
    return `/api/uploads/${normalized.slice("/uploads/".length)}`
  }
  return normalized
}
