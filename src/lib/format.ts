/** Zona horaria de la app: los servidores de Vercel van en UTC. */
export const APP_TIME_ZONE = "Europe/Madrid";

const dateTime = new Intl.DateTimeFormat("es-ES", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "14 oct, 09:30" */
export function formatDateTime(iso: string | Date) {
  return dateTime.format(new Date(iso));
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 3 horas", "ayer", "hace 5 días" (respecto a `now`). */
export function timeAgo(iso: string | Date, now: Date = new Date()) {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "ahora mismo";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86_400), "day");
}

/** "km" con un decimal por debajo de 10 km. */
export function formatKm(km: number) {
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

/** Enlace para un contacto libre: tel: si parece un teléfono, mailto: si es un email. */
export function contactHref(contact: string): string | null {
  const trimmed = contact.trim();
  if (/^\S+@\S+\.\S+$/.test(trimmed)) return `mailto:${trimmed}`;
  const digits = trimmed.replace(/[\s().-]/g, "");
  if (/^\+?\d{9,13}$/.test(digits)) return `tel:${digits}`;
  return null;
}

/** Valor para <input type="datetime-local"> en hora de Madrid. */
export function toDateTimeLocalValue(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return parts.replace(" ", "T");
}
