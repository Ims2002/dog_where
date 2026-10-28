import "server-only";

import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";

import { fail, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

import {
  clientIp,
  isHoneypotFilled,
  RATE_LIMITS,
  retryMessage,
  type LimitedAction,
} from "./limits";

const log = createLogger("anti-spam");

/** En local no molesta al probar; RATE_LIMIT=on para probarlo. */
function enabled() {
  return process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "on";
}

/** La IP no se guarda en claro: HMAC con el secreto de la app, recortado. */
function ipKey(ip: string) {
  return createHmac("sha256", env.authSecret()).update(ip).digest("hex").slice(0, 32);
}

/**
 * Cuenta un envío y dice si se permite. Una sola sentencia atómica (sin carreras entre
 * peticiones simultáneas). Si la BD falla, deja pasar: mejor un spam que bloquear a todos.
 */
export async function consumeRateLimit(
  action: LimitedAction,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  if (!enabled()) return { allowed: true };
  const { max, windowSec } = RATE_LIMITS[action];
  const key = `${action}:${ipKey(clientIp(await headers()))}`;

  try {
    const result = await getDb().execute<{ count: number; retry_after: number }>(sql`
      insert into action_limits (key, window_start, count) values (${key}, now(), 1)
      on conflict (key) do update set
        count = case when action_limits.window_start <= now() - make_interval(secs => ${windowSec})
                     then 1 else action_limits.count + 1 end,
        window_start = case when action_limits.window_start <= now() - make_interval(secs => ${windowSec})
                            then now() else action_limits.window_start end
      returning count,
        greatest(0, ceil(extract(epoch from (window_start + make_interval(secs => ${windowSec}) - now()))))::int as retry_after
    `);
    const row = result.rows[0];
    if (row && row.count > max) {
      log.warn("rate_limit.exceeded", { limit: action, count: row.count, max });
      return { allowed: false, retryAfterSec: row.retry_after };
    }
    return { allowed: true };
  } catch (error) {
    log.error("rate_limit.failed", { limit: action }, error);
    return { allowed: true };
  }
}

/**
 * Comprobaciones anti-spam al principio de una Server Action: campo trampa y límite.
 * Devuelve el ActionResult de rechazo, o null si puede seguir.
 */
export async function guardAction(
  action: LimitedAction,
  input?: unknown,
): Promise<ActionResult<never> | null> {
  if (isHoneypotFilled(input)) {
    log.warn("spam.honeypot", { limit: action });
    return fail("No se ha podido enviar. Inténtalo de nuevo.");
  }
  const limit = await consumeRateLimit(action);
  return limit.allowed ? null : fail(retryMessage(limit.retryAfterSec));
}

/** Borra contadores antiguos (lo llama el cron diario). */
export async function purgeRateLimits() {
  const result = await getDb().execute(
    sql`delete from action_limits where window_start < now() - interval '1 day'`,
  );
  return result.rowCount ?? 0;
}
