/**
 * Límites de envíos por IP (ventana fija). Generosos para un vecino que publica de verdad,
 * cortos para un script. Los de cuentas (login, registro…) los pone Better Auth.
 */
export const RATE_LIMITS = {
  "photo.upload": { max: 20, windowSec: 3600 },
  "post.create": { max: 5, windowSec: 3600 },
  "sighting.create": { max: 20, windowSec: 3600 },
  "report.create": { max: 10, windowSec: 3600 },
} as const satisfies Record<string, { max: number; windowSec: number }>;

export type LimitedAction = keyof typeof RATE_LIMITS;

/** Nombre del campo trampa: invisible para personas, los bots suelen rellenarlo. */
export const HONEYPOT_FIELD = "website";
export type HoneypotInput = { [HONEYPOT_FIELD]?: string };

/** ¿Ha rellenado el campo trampa? */
export function isHoneypotFilled(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const value = (input as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim() !== "";
}

/** IP del cliente en Vercel (x-real-ip) o tras otro proxy (primera de x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** "Vuelve a intentarlo en 12 min" a partir de los segundos que faltan. */
export function retryMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Has hecho demasiados envíos seguidos. Vuelve a intentarlo en ${minutes} min.`;
}
