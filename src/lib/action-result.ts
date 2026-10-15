import type { z } from "zod";

/** Resultado tipado de una Server Action (ver docs/GUIDELINES.md § 4). */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Convierte un error de Zod en { "campo.anidado": "mensaje" } (el primero por campo). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export function failValidation(error: z.ZodError): ActionResult<never> {
  return fail("Revisa los campos marcados.", toFieldErrors(error));
}
