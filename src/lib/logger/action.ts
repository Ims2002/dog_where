import "server-only";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";

import { createLogger } from "./index";
import { withLogContext } from "./context";

const log = createLogger("action");

/** Id de la petición: el de Vercel si existe (sirve para cruzar con sus logs de acceso). */
export async function currentRequestId(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-vercel-id") ?? h.get("x-request-id") ?? randomUUID();
  } catch {
    return randomUUID();
  }
}

/**
 * Envuelve el cuerpo de una Server Action:
 * - añade `requestId` y `action` a todos los logs que se emitan dentro;
 * - registra el resultado (`action.done` ok/rechazada) y lo que tarda;
 * - registra las excepciones inesperadas (`action.error`) y las vuelve a lanzar.
 *
 *   export async function createPost(input: CreatePostInput) {
 *     return runAction("post.create", async () => { ... });
 *   }
 */
export async function runAction<T extends ActionResult<unknown>>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const requestId = await currentRequestId();
  return withLogContext({ requestId, action: name }, async () => {
    const start = performance.now();
    const durationMs = () => Math.round(performance.now() - start);
    try {
      const result = await fn();
      if (result.ok) {
        log.info("action.done", { outcome: "ok", durationMs: durationMs() });
      } else {
        // Errores esperados (validación, permisos…): solo los nombres de campo, nunca valores.
        log.warn("action.done", {
          outcome: "rejected",
          reason: result.error,
          fields: result.fieldErrors ? Object.keys(result.fieldErrors) : undefined,
          durationMs: durationMs(),
        });
      }
      return result;
    } catch (error) {
      unstable_rethrow(error); // redirect(), notFound()… no son errores
      log.error("action.error", { durationMs: durationMs() }, error);
      throw error;
    }
  });
}
