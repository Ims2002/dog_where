import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token aleatorio para enlaces secretos (192 bits, URL-safe). */
export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Hash que se guarda en la BD en lugar del token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compara en tiempo constante un token con su hash guardado. */
export function verifyToken(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
