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
  
  // Se for uma URL completa ou base64, retorna como está
  if (url.startsWith('http') || url.startsWith('data:')) return url

  let path = url;
  
  // Remover qualquer prefixo de API se existir
  if (path.startsWith('/api/uploads/')) {
    path = path.slice('/api/uploads/'.length);
  } else if (path.startsWith('/uploads/')) {
    path = path.slice('/uploads/'.length);
  } else if (path.startsWith('uploads/')) {
    path = path.slice('uploads/'.length);
  } else if (path.startsWith('/')) {
    path = path.slice(1);
  }

  // Agora path é apenas o nome do arquivo ou subcaminho (ex: usuarios/file.jpg)
  return `/api/uploads/${path}`
}

export function numberToExtenso(numero: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezena_especial = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function converter(num: number): string {
    if (num === 0) return "";
    if (num < 10) return unidades[num];
    if (num < 20) return dezena_especial[num - 10];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return dezenas[d] + (u !== 0 ? " e " + unidades[u] : "");
    }
    if (num === 100) return "cem";
    if (num < 1000) {
      const c = Math.floor(num / 10);
      const resto = num % 100;
      if (resto === 0) return centenas[Math.floor(num / 100)];
      return centenas[Math.floor(num / 100)] + " e " + converter(resto);
    }
    return "";
  }

  if (numero === 0) return "zero reais";

  const reais = Math.floor(numero);
  const centavos = Math.round((numero - reais) * 100);

  let extenso = "";

  if (reais > 0) {
    if (reais === 1) extenso = "um real";
    else {
      if (reais < 1000) extenso = converter(reais) + " reais";
      else if (reais < 1000000) {
        const mil = Math.floor(reais / 1000);
        const resto = reais % 1000;
        extenso = (mil === 1 ? "mil" : converter(mil) + " mil") + (resto > 0 ? (resto < 100 || resto % 100 === 0 ? " e " : " ") + converter(resto) : "") + " reais";
      }
    }
  }

  if (centavos > 0) {
    if (extenso !== "") extenso += " e ";
    if (centavos === 1) extenso += "um centavo";
    else extenso += converter(centavos) + " centavos";
  }

  return extenso;
}
