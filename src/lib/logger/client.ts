/**
 * Envío de errores del navegador al servidor (/api/log/client), donde se registran
 * como `client.error`. Sin dependencias de Node: se puede importar desde el cliente.
 */

const ENDPOINT = "/api/log/client";
const MAX_REPORTS_PER_PAGE = 10;

let sent = 0;
const seen = new Set<string>();

export type ClientErrorSource = "window" | "unhandledrejection" | "error-boundary" | "global-error";

function safePath() {
  // El enlace de gestión lleva un secreto en la ruta: nunca sale del navegador.
  return window.location.pathname.replace(/(\/gestionar\/[^/]+\/)[^/]+/, "$1[redacted]");
}

export function reportClientError(
  error: unknown,
  source: ClientErrorSource,
  extra: { digest?: string } = {},
) {
  try {
    if (typeof window === "undefined" || sent >= MAX_REPORTS_PER_PAGE) return;
    const err = error instanceof Error ? error : new Error(String(error));
    const key = `${source}:${err.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;

    const body = JSON.stringify({
      source,
      name: err.name.slice(0, 100),
      message: err.message.slice(0, 500),
      stack: err.stack?.slice(0, 2000),
      digest: extra.digest,
      path: safePath(),
    });

    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
      void fetch(ENDPOINT, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    // Informar de un error nunca debe provocar otro.
  }
}
