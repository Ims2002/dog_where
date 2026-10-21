/**
 * Limpieza de datos personales antes de escribir un log (RGPD).
 * Los logs se guardan en Vercel y pueden acabar en servicios externos: nunca deben
 * contener teléfonos, emails, nombres, ubicaciones, textos libres ni secretos.
 */

export const REDACTED = "[redacted]";

/** Claves cuyo valor nunca se escribe (comparación sin mayúsculas). */
const SENSITIVE_KEYS = new Set([
  "lat",
  "lng",
  "latitude",
  "longitude",
  "location",
  "foundlocation",
  "custodylocation",
  "address",
  "tagtext",
  "tagphone",
  "phone",
  "email",
  "findername",
  "name",
  "image",
  "findercontact",
  "reportername",
  "description",
  "note",
  "details",
  "ip",
  "headers",
  "cookie",
  "authorization",
]);

/** Sufijos de clave sensibles (p. ej. manageToken, BLOB_READ_WRITE_TOKEN, dbPassword). */
const SENSITIVE_SUFFIX = /(token|password|secret|apikey|hash)$/i;

export function isSensitiveKey(key: string) {
  return SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_SUFFIX.test(key);
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Teléfonos españoles (con o sin +34, con espacios o guiones). No casa con fechas ni UUIDs.
const PHONE = /(?<![\w-])(?:\+34|0034)?[\s-]?[6789](?:[\s-]?\d){8}(?![\w-])/g;
// Drizzle añade los parámetros de la consulta al mensaje de error: pueden ser datos personales.
const QUERY_PARAMS = /\bparams:[\s\S]*$/;
// Rutas con secreto: /gestionar/<id>/<token> y /reset-password/<token> (Better Auth)
const MANAGE_PATH = /(\/gestionar\/[^/\s?#]+\/)[^/\s?#]+/g;
const RESET_PATH = /(\/reset-password\/)[^/\s?#]+/g;
// Tokens y códigos de OAuth en query strings (?token=…, &code=…, &state=…)
const SECRET_PARAMS = /([?&](?:token|code|state|id_token|access_token)=)[^&\s#]+/gi;

/** Quita de un texto emails, teléfonos, parámetros de consultas y tokens en rutas. */
export function scrubText(text: string): string {
  return text
    .replace(QUERY_PARAMS, `params: ${REDACTED}`)
    .replace(MANAGE_PATH, `$1${REDACTED}`)
    .replace(RESET_PATH, `$1${REDACTED}`)
    .replace(SECRET_PARAMS, `$1${REDACTED}`)
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[phone]");
}

/** Copia profunda del valor con las claves sensibles tapadas y los textos limpios. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[max-depth]";
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value, depth);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
  code?: string;
  cause?: unknown;
};

/** Error → objeto plano (los Error no se serializan bien con JSON.stringify). */
export function serializeError(error: unknown, depth = 0): SerializedError {
  if (!(error instanceof Error)) {
    return { name: "NonError", message: scrubText(String(error)) };
  }
  const extra = error as Error & { digest?: unknown; code?: unknown };
  return {
    name: error.name,
    message: scrubText(error.message),
    stack: error.stack ? scrubText(error.stack).split("\n").slice(0, 12).join("\n") : undefined,
    digest: typeof extra.digest === "string" ? extra.digest : undefined,
    code: typeof extra.code === "string" ? extra.code : undefined,
    cause:
      error.cause !== undefined && depth < 3 ? serializeError(error.cause, depth + 1) : undefined,
  };
}
