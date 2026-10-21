import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

/** GET /api/health — comprobación de vida y de conexión a la base de datos. */
export async function GET() {
  await connection(); // siempre en tiempo de petición, nunca prerenderizado

  const start = performance.now();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    log.error("health.db_error", { durationMs: Math.round(performance.now() - start) }, error);
    return Response.json({ status: "degraded", db: "error" }, { status: 503 });
  }
}
