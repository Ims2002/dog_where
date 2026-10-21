/**
 * Logger de DogWhere: logs estructurados (una línea JSON por evento) que Vercel recoge
 * de stdout/stderr y permite filtrar por `event`, `level`, `requestId`, `module`…
 *
 *   import { createLogger } from "@/lib/logger";
 *   const log = createLogger("posts");
 *   log.info("post.created", { postId, custody });
 *   log.error("storage.delete_failed", { count }, error);
 *
 * Reglas (docs/LOGGING.md): eventos con nombre `dominio.accion`, nunca datos personales
 * (se redactan solos, pero no los pases), y los errores siempre como tercer argumento.
 */
import { getLogContext } from "./context";
import { redact, serializeError } from "./redact";

export const LEVELS = ["debug", "info", "warn", "error"] as const;
export type Level = (typeof LEVELS)[number];
type Threshold = Level | "silent";

const RANK: Record<Threshold, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

function threshold(): Threshold {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in RANK) return configured as Threshold;
  if (process.env.NODE_ENV === "test") return "silent";
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function jsonFormat() {
  const format = process.env.LOG_FORMAT?.toLowerCase();
  if (format === "json") return true;
  if (format === "pretty") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Hora actual sin `new Date()`: con Cache Components, Next.js prohíbe leer la hora mientras
 * prerenderiza, y un log (p. ej. de un error) puede emitirse en ese momento. Para
 * telemetría recomienda la API de tiempos de alta resolución.
 */
function nowIso() {
  return new Date(performance.timeOrigin + performance.now()).toISOString();
}

export type LogData = Record<string, unknown>;

export type LogRecord = {
  ts: string;
  level: Level;
  event: string;
  service: "dogwhere";
  env?: string;
  module?: string;
  err?: ReturnType<typeof serializeError>;
  [key: string]: unknown;
};

/** Destino de los registros. Se puede sustituir (tests, log drains…). */
export type LogSink = (record: LogRecord) => void;

const COLORS: Record<Level, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const consoleSink: LogSink = (record) => {
  const write =
    record.level === "error" ? console.error : record.level === "warn" ? console.warn : console.log;

  if (jsonFormat()) {
    write(JSON.stringify(record));
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- se descartan en modo legible
  const { ts, level, event, service, env, module, err, ...rest } = record;
  const time = ts.slice(11, 23);
  const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  write(
    `${COLORS[level]}${time} ${level.toUpperCase().padEnd(5)}\x1b[0m ${module ? `[${module}] ` : ""}${event}${extra}`,
  );
  if (err) write(err.stack ?? `${err.name}: ${err.message}`);
};

let sink: LogSink = consoleSink;

/** Cambia el destino de los logs (devuelve una función para restaurar el anterior). */
export function setLogSink(next: LogSink) {
  const previous = sink;
  sink = next;
  return () => {
    sink = previous;
  };
}

export type Logger = {
  debug(event: string, data?: LogData): void;
  info(event: string, data?: LogData): void;
  warn(event: string, data?: LogData, error?: unknown): void;
  error(event: string, data?: LogData, error?: unknown): void;
  /** Logger hijo con campos fijos (p. ej. { module: "storage" }). */
  child(bindings: LogData): Logger;
  /** Mide lo que tarda `fn` y lo añade como `durationMs` al evento final. */
  time<T>(event: string, fn: () => Promise<T>, data?: LogData): Promise<T>;
};

function emit(level: Level, bindings: LogData, event: string, data?: LogData, error?: unknown) {
  if (RANK[level] < RANK[threshold()]) return;
  try {
    const record: LogRecord = {
      ts: nowIso(),
      level,
      event,
      service: "dogwhere",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      ...(redact({ ...bindings, ...getLogContext(), ...data }) as LogData),
    };
    if (error !== undefined) record.err = serializeError(error);
    sink(record);
  } catch {
    // Un fallo al escribir un log nunca debe romper la petición.
  }
}

function build(bindings: LogData): Logger {
  const logger: Logger = {
    debug: (event, data) => emit("debug", bindings, event, data),
    info: (event, data) => emit("info", bindings, event, data),
    warn: (event, data, error) => emit("warn", bindings, event, data, error),
    error: (event, data, error) => emit("error", bindings, event, data, error),
    child: (more) => build({ ...bindings, ...more }),
    async time(event, fn, data) {
      const start = performance.now();
      try {
        const result = await fn();
        logger.info(event, { ...data, durationMs: Math.round(performance.now() - start) });
        return result;
      } catch (error) {
        logger.error(
          `${event}.failed`,
          { ...data, durationMs: Math.round(performance.now() - start) },
          error,
        );
        throw error;
      }
    },
  };
  return logger;
}

/** Logger raíz. */
export const logger = build({});

/** Logger de un módulo: `createLogger("posts")` añade `module: "posts"` a cada evento. */
export function createLogger(module: string, bindings: LogData = {}) {
  return logger.child({ module, ...bindings });
}

export { getLogContext, withLogContext } from "./context";
export { redact, scrubText, serializeError } from "./redact";
