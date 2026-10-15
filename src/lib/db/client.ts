import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

/** true si la URL apunta a Neon (producción / previews). */
export function isNeonUrl(url: string) {
  return new URL(url).hostname.endsWith(".neon.tech");
}

/**
 * Crea el cliente de Drizzle.
 * - Neon → driver HTTP serverless (sin conexiones persistentes, ideal en Vercel).
 * - Cualquier otro Postgres (Docker en local, CI) → driver `pg`.
 *
 * Ambos se exponen con el mismo tipo. Por eso el código de la app usa solo la API
 * común: nada de `db.transaction()` ni `db.batch()` (ver docs/GUIDELINES.md § 6).
 */
export function createDbClient(url: string): Db {
  if (isNeonUrl(url)) {
    return drizzleNeon({ client: neon(url), schema });
  }
  return drizzlePg({
    client: new Pool({ connectionString: url, max: 5 }),
    schema,
  }) as unknown as Db;
}
