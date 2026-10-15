import "server-only";

import { env } from "@/lib/env";

import { createDbClient, type Db } from "./client";
import * as schema from "./schema";

let db: Db | undefined;

/** Cliente de Drizzle. Se crea en el primer uso. */
export function getDb(): Db {
  db ??= createDbClient(env.databaseUrl());
  return db;
}

export { schema };
export type { Db };
