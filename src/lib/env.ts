import { z } from "zod";

/**
 * Variables de entorno del servidor, validadas con Zod.
 * Se validan de forma perezosa (al primer uso) para que `next build`
 * no falle en entornos sin secretos (CI, previews sin integración).
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas o ausentes: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
