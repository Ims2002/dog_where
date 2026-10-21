import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLogger, setLogSink, withLogContext, type LogRecord } from "./index";
import { redact, scrubText, serializeError } from "./redact";

describe("redact / scrubText (datos personales fuera de los logs)", () => {
  it("tapa las claves sensibles a cualquier profundidad", () => {
    const out = redact({
      postId: "abc",
      tagPhone: "612345678",
      finderContact: "ana@example.com",
      foundLocation: { lat: 38.7, lng: 0.1 },
      nested: { manageToken: "secreto", custodyLat: 38.1, shelterId: "s1" },
    }) as Record<string, unknown>;
    expect(out.postId).toBe("abc");
    expect(out.tagPhone).toBe("[redacted]");
    expect(out.finderContact).toBe("[redacted]");
    expect(out.foundLocation).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).manageToken).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).shelterId).toBe("s1");
  });

  it("limpia emails, teléfonos, parámetros de consultas y tokens en rutas", () => {
    expect(scrubText("contacto: ana@example.com")).toBe("contacto: [email]");
    expect(scrubText("llama al +34 612 345 678 ya")).toBe("llama al [phone] ya");
    expect(scrubText("Failed query: select 1\nparams: 612345678,Ana")).toBe(
      "Failed query: select 1\nparams: [redacted]",
    );
    expect(scrubText("/gestionar/8f8f2c3e/AbCdEf123")).toBe("/gestionar/8f8f2c3e/[redacted]");
    expect(scrubText("/api/auth/reset-password/AbC123?callbackURL=/x")).toBe(
      "/api/auth/reset-password/[redacted]?callbackURL=/x",
    );
    expect(scrubText("/api/auth/verify-email?token=eyJhbGci.x.y&callbackURL=/")).toBe(
      "/api/auth/verify-email?token=[redacted]&callbackURL=/",
    );
    expect(scrubText("/callback/google?state=abc&code=4%2F0Ab")).toBe(
      "/callback/google?state=[redacted]&code=[redacted]",
    );
  });

  it("no confunde fechas ni UUIDs con teléfonos", () => {
    const text = "2026-10-15 id 8f8f2c3e-1111-4a4a-9b9b-123456789abc ts 1792057445340";
    expect(scrubText(text)).toBe(text);
  });

  it("serializa errores con causa y digest", () => {
    const err = Object.assign(new Error("fallo con 612345678", { cause: new Error("raíz") }), {
      digest: "123",
    });
    const s = serializeError(err);
    expect(s.message).toBe("fallo con [phone]");
    expect(s.digest).toBe("123");
    expect(s.cause).toMatchObject({ message: "raíz" });
  });
});

describe("logger", () => {
  let records: LogRecord[];
  let restore: () => void;
  const prevLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    records = [];
    restore = setLogSink((r) => records.push(r));
    process.env.LOG_LEVEL = "info";
  });
  afterEach(() => {
    restore();
    process.env.LOG_LEVEL = prevLevel;
  });

  it("emite registros estructurados con módulo y nivel", () => {
    createLogger("posts").info("post.created", { postId: "p1", custody: "not_caught" });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: "info",
      event: "post.created",
      module: "posts",
      service: "dogwhere",
      postId: "p1",
      custody: "not_caught",
    });
  });

  it("respeta el nivel mínimo", () => {
    const log = createLogger("x");
    log.debug("ruido");
    log.warn("aviso");
    expect(records.map((r) => r.event)).toEqual(["aviso"]);
  });

  it("propaga el contexto de la petición a través de llamadas asíncronas", async () => {
    const log = createLogger("posts");
    await withLogContext({ requestId: "req-1", action: "post.create" }, async () => {
      await Promise.resolve();
      log.info("post.created");
    });
    log.info("fuera");
    expect(records[0]).toMatchObject({ requestId: "req-1", action: "post.create" });
    expect(records[1].requestId).toBeUndefined();
  });

  it("adjunta el error serializado y redacta los datos", () => {
    createLogger("storage").error("storage.delete_failed", { finderName: "Ana" }, new Error("x"));
    expect(records[0].finderName).toBe("[redacted]");
    expect(records[0].err).toMatchObject({ name: "Error", message: "x" });
  });

  it("time() mide la duración y registra el fallo", async () => {
    const log = createLogger("cron");
    await log.time("cron.expire", async () => 1);
    await expect(
      log.time("cron.expire", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(records[0]).toMatchObject({ event: "cron.expire", level: "info" });
    expect(typeof records[0].durationMs).toBe("number");
    expect(records[1]).toMatchObject({ event: "cron.expire.failed", level: "error" });
  });
});
