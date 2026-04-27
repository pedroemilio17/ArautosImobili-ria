/**
 * Limpa strings vindas do banco que podem conter aspas duplas, vírgulas finais
 * e espaços (legado da ingestão original dos leads).
 */
export function clean(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/^["'\s]+|["'\s,]+$/g, "")
    .trim();
}

export function cleanLower(value: string | null | undefined): string {
  return clean(value).toLowerCase();
}

export function isEmptyValue(value: string | null | undefined): boolean {
  const v = cleanLower(value);
  return (
    v === "" ||
    v === "não informado" ||
    v === "nao informado" ||
    v === "indefinida" ||
    v === "indefinido" ||
    v === "n/a" ||
    v === "null"
  );
}

/** Formata um número de WhatsApp para exibição: 55 65 9999-9999 */
export function formatWhatsapp(raw: string | null | undefined): string {
  const digits = clean(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 12) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const rest = digits.slice(4);
    const mid = rest.slice(0, rest.length - 4);
    const end = rest.slice(-4);
    return `+${country} (${area}) ${mid}-${end}`;
  }
  return digits;
}

export function whatsappLink(raw: string | null | undefined): string {
  const digits = clean(raw).replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}