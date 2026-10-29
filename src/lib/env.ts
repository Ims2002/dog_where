import { z } from "zod";

/**
 * Variables de entorno del servidor. Cada una se valida de forma perezosa,
 * al usarse: así `next build` no exige secretos que la página no necesita
 * (p. ej. prerenderizar /protectoras solo necesita la BD).
 */
function read<T>(name: string, schema: z.ZodType<T>): T {
  // Una variable vacía (p. ej. copiada de .env.example) cuenta como no definida.
  const parsed = schema.safeParse(process.env[name] || undefined);
  if (!parsed.success) {
    throw new Error(`Variable de entorno ${name} inválida o ausente`);
  }
  return parsed.data;
}

const isProduction = () => process.env.NODE_ENV === "production";

export const env = {
  /**
   * Postgres. En Vercel, la integración de Supabase crea POSTGRES_URL (pooler en modo
   * transacción). DATABASE_URL sirve como alternativa (Postgres local, CI).
   */
  databaseUrl: () =>
    process.env.POSTGRES_URL ? read("POSTGRES_URL", z.url()) : read("DATABASE_URL", z.url()),
  /** Vercel Blob. En desarrollo es opcional: sin token, las fotos van a public/dev-uploads. */
  blobToken: () =>
    read(
      "BLOB_READ_WRITE_TOKEN",
      isProduction() ? z.string().min(1) : z.string().min(1).optional(),
    ),
  /** Vercel lo envía como "Authorization: Bearer <CRON_SECRET>". Obligatorio en producción. */
  cronSecret: () =>
    read("CRON_SECRET", isProduction() ? z.string().min(16) : z.string().optional()),
  /** Firma de sesiones y tokens de Better Auth. Obligatorio en producción (32+ caracteres). */
  authSecret: () =>
    read(
      "BETTER_AUTH_SECRET",
      isProduction() ? z.string().min(32) : z.string().min(1).optional(),
    ) ?? "dev-secret-solo-para-desarrollo-local-no-usar",
  // Los emails (Resend o SMTP) se configuran en src/lib/email/transport.ts.
};

type Env = Record<string, string | undefined>;

const withoutSlash = (url: string) => url.replace(/\/+$/, "");
const https = (host: string | undefined) => (host ? `https://${withoutSlash(host)}` : undefined);

/**
 * URL base de la app para Better Auth (callbacks de OAuth, enlaces de los emails).
 * 1. BETTER_AUTH_URL si está.
 * 2. En Vercel, la URL real del despliegue: la de producción (su dominio principal) o la
 *    de la preview. Así no depende de que NEXT_PUBLIC_SITE_URL esté bien escrita.
 * 3. NEXT_PUBLIC_SITE_URL, y si no, localhost.
 */
export function authBaseUrl(e: Env = process.env): string {
  if (e.BETTER_AUTH_URL) return withoutSlash(e.BETTER_AUTH_URL);
  if (e.VERCEL_ENV === "production" && e.VERCEL_PROJECT_PRODUCTION_URL) {
    return https(e.VERCEL_PROJECT_PRODUCTION_URL)!;
  }
  if (e.VERCEL_ENV === "preview" && e.VERCEL_URL) return https(e.VERCEL_URL)!;
  return withoutSlash(e.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}

/**
 * Orígenes desde los que se aceptan peticiones de login/registro: la URL base, la de
 * producción, la del despliegue concreto y la de la rama (Vercel da varias por despliegue).
 */
export function authTrustedOrigins(e: Env = process.env): string[] {
  const origins = [
    authBaseUrl(e),
    e.NEXT_PUBLIC_SITE_URL && withoutSlash(e.NEXT_PUBLIC_SITE_URL),
    https(e.VERCEL_PROJECT_PRODUCTION_URL),
    https(e.VERCEL_URL),
    https(e.VERCEL_BRANCH_URL),
    "https://appleid.apple.com", // Apple devuelve el login con un POST desde su dominio
  ];
  return [...new Set(origins.filter((o): o is string => !!o))];
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
