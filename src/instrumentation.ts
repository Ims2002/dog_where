import type { Instrumentation } from "next";

/**
 * Observabilidad del servidor (Next.js la carga al arrancar cada instancia).
 * - register: deja constancia de cada arranque (útil para cruzar con despliegues).
 * - onRequestError: cualquier error no capturado al renderizar, en route handlers,
 *   Server Actions o proxy acaba aquí, con la ruta y el digest que ve el usuario.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { createLogger } = await import("@/lib/logger");
  createLogger("app").info("app.start", {
    region: process.env.VERCEL_REGION,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { createLogger } = await import("@/lib/logger");
  const requestId = request.headers["x-vercel-id"];
  createLogger("next").error(
    "request.error",
    {
      requestId: typeof requestId === "string" ? requestId : undefined,
      method: request.method,
      // La plantilla de la ruta (/gestionar/[id]/[token]), nunca la URL real: puede llevar secretos.
      route: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
    error,
  );
};
