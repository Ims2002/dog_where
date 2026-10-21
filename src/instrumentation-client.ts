import { reportClientError } from "@/lib/logger/client";

/**
 * Se ejecuta en el navegador antes de que la app sea interactiva.
 * Recoge los errores de JavaScript que no captura ningún componente
 * (p. ej. un fallo del mapa) y los envía al servidor para que queden en los logs.
 */
const IGNORED = [/ResizeObserver loop/, /^Script error\.?$/];

window.addEventListener("error", (event) => {
  if (event.filename && !event.filename.startsWith(window.location.origin)) return; // extensiones
  const error = event.error ?? new Error(event.message);
  if (IGNORED.some((re) => re.test(String(error?.message ?? "")))) return;
  reportClientError(error, "window");
});

window.addEventListener("unhandledrejection", (event) => {
  reportClientError(event.reason, "unhandledrejection");
});
