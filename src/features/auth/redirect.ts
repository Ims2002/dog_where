/** Adónde volver tras entrar: solo rutas internas (evita redirecciones abiertas). */
export function safeNext(value: unknown, fallback = "/cuenta"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/") || /^\/(entrar|registro)(\/|\?|$)/.test(value)) return fallback;
  return value.length > 300 ? fallback : value;
}

/** Añade ?next=… a una ruta de acceso si no es el destino por defecto. */
export function withNext(path: string, next: string) {
  return next === "/cuenta" ? path : `${path}?next=${encodeURIComponent(next)}`;
}
