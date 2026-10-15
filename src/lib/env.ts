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
};

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
