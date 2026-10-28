import { describe, expect, it } from "vitest";

import { clientIp, isHoneypotFilled, retryMessage } from "./limits";

describe("anti-spam", () => {
  it("detecta el campo trampa relleno", () => {
    expect(isHoneypotFilled({ website: "http://spam" })).toBe(true);
    expect(isHoneypotFilled({ website: "  " })).toBe(false);
    expect(isHoneypotFilled({ website: "" })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled(null)).toBe(false);
  });

  it("lee la IP del cliente", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "1.2.3.4",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("mensaje de espera en minutos (mínimo 1)", () => {
    expect(retryMessage(30)).toMatch(/1 min/);
    expect(retryMessage(721)).toMatch(/13 min/);
  });
});
