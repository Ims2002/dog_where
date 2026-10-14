import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

function createDb() {
  return drizzle({ client: neon(getServerEnv().DATABASE_URL), schema });
}

let db: ReturnType<typeof createDb> | undefined;

/** Cliente de Drizzle (HTTP serverless de Neon). Se crea en el primer uso. */
export function getDb() {
  db ??= createDb();
  return db;
}

export { schema };
