import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db";

/** GET /api/health — comprobación de vida y de conexión a la base de datos. */
export async function GET() {
  await connection(); // siempre en tiempo de petición, nunca prerenderizado

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json({ status: "degraded", db: "error" }, { status: 503 });
  }
}
