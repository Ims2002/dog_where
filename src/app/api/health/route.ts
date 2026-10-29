import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { emailPasswordEnabled, enabledSocialProviders } from "@/lib/auth/providers";
import { getDb } from "@/lib/db";
import { emailTransport } from "@/lib/email/transport";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

/**
 * GET /api/health — comprobación de vida, de la base de datos y de qué está configurado
 * (sin secretos: lo mismo que ya se ve en la interfaz).
 */
export async function GET() {
  await connection(); // siempre en tiempo de petición, nunca prerenderizado

  const config = {
    email: emailTransport()?.kind ?? "none",
    login: {
      email: emailPasswordEnabled(),
      social: enabledSocialProviders(),
    },
  };

  const start = performance.now();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok", ...config });
  } catch (error) {
    log.error("health.db_error", { durationMs: Math.round(performance.now() - start) }, error);
    return Response.json({ status: "degraded", db: "error", ...config }, { status: 503 });
  }
}
