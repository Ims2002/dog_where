import { describe, expect, it } from "vitest";

import { authErrorMessage, callbackErrorMessage } from "./errors";
import { safeNext, withNext } from "./redirect";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/publicar")).toBe("/publicar");
    expect(safeNext("/mascota/abc?x=1")).toBe("/mascota/abc?x=1");
  });

  it("rechaza redirecciones externas o raras", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "/api/auth/sign-out",
      "/entrar",
      "/registro?next=/x",
      undefined,
      42,
    ]) {
      expect(safeNext(bad)).toBe("/cuenta");
    }
  });

  it("withNext omite el destino por defecto", () => {
    expect(withNext("/entrar", "/cuenta")).toBe("/entrar");
    expect(withNext("/entrar", "/publicar")).toBe("/entrar?next=%2Fpublicar");
  });
});

describe("mensajes de error", () => {
  it("traduce códigos conocidos y limita por 429", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toMatch(
      /no son correctos/,
    );
    expect(authErrorMessage({ code: "X", status: 429 })).toMatch(/Demasiados intentos/);
    expect(authErrorMessage({ code: "DESCONOCIDO" })).toMatch(/Algo ha fallado/);
  });

  it("traduce errores del callback social", () => {
    expect(callbackErrorMessage(undefined)).toBeNull();
    expect(callbackErrorMessage("access_denied")).toMatch(/cancelado/);
    expect(callbackErrorMessage("otro")).toMatch(/No se ha podido.*Código: otro/);
    expect(callbackErrorMessage("state_mismatch")).toMatch(/caducado/);
  });
});
