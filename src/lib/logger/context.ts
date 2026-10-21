import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto que acompaña a todos los logs de una misma petición (requestId, acción…).
 * Se propaga solo a través de las llamadas asíncronas: no hace falta pasarlo a mano.
 */
export type LogContext = Record<string, string | number | boolean | undefined>;

const storage = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}

/** Ejecuta `fn` con contexto añadido (se combina con el que ya hubiera). */
export function withLogContext<T>(context: LogContext, fn: () => T): T {
  return storage.run({ ...getLogContext(), ...context }, fn);
}
