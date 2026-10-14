/**
 * Normaliza un teléfono español a 9 dígitos (sin prefijo +34).
 * Devuelve null si no parece un número español válido.
 */
export function normalizeSpanishPhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "").replace(/^(\+34|0034)/, "");
  return /^[6789]\d{8}$/.test(digits) ? digits : null;
}

/** Enmascara un teléfono dejando visibles solo los 3 últimos dígitos: "••• ••• 678". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return "•••";
  return `••• ••• ${digits.slice(-3)}`;
}
