import type { Logger as DrizzleLogger } from "drizzle-orm/logger";

import { createLogger } from "./index";

const log = createLogger("db");

/**
 * Logger de consultas para Drizzle. Se activa con LOG_DB_QUERIES=true (nivel debug).
 * Se registra el SQL pero nunca los parámetros, que pueden ser datos personales.
 */
export const drizzleLogger: DrizzleLogger = {
  logQuery(query, params) {
    log.debug("db.query", { sql: query.slice(0, 300), paramCount: params.length });
  },
};
