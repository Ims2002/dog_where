import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { pgConfigFromUrl } from "./connection";
import * as schema from "./schema";

/**
 * Crea el cliente de Drizzle sobre `pg`.
 *
 * En Vercel se conecta al pooler de Supabase en modo transacción (POSTGRES_URL,
 * puerto 6543), que reparte pocas conexiones reales entre muchas funciones.
 * El pool de cada función es pequeño y `attachDatabasePool` cierra las conexiones
 * ociosas antes de que Vercel congele la instancia.
 */
export function createDbClient(url: string) {
  const pool = new Pool({ ...pgConfigFromUrl(url), max: 5, idleTimeoutMillis: 5_000 });
  if (process.env.VERCEL) attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
}

export type Db = ReturnType<typeof createDbClient>;
