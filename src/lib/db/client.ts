import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { createLogger } from "@/lib/logger";
import { drizzleLogger } from "@/lib/logger/drizzle";

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
const log = createLogger("db");

export function createDbClient(url: string) {
  const pool = new Pool({ ...pgConfigFromUrl(url), max: 5, idleTimeoutMillis: 5_000 });
  // Sin este listener, un error en una conexión ociosa (p. ej. Supabase la corta)
  // tumbaría el proceso entero.
  pool.on("error", (error) => log.error("db.pool_error", {}, error));
  if (process.env.VERCEL) attachDatabasePool(pool);
  // Las consultas solo se registran si se pide (LOG_DB_QUERIES=true): son muchas.
  const logQueries = process.env.LOG_DB_QUERIES === "true";
  return drizzle({ client: pool, schema, logger: logQueries ? drizzleLogger : false });
}

export type Db = ReturnType<typeof createDbClient>;
