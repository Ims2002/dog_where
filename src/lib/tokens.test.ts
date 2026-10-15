import { describe, expect, it } from "vitest";

import { generateToken, hashToken, verifyToken } from "./tokens";

describe("tokens de gestión", () => {
  it("genera tokens únicos y URL-safe", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generateToken()).not.toBe(a);
  });

  it("verifica el token correcto y rechaza los demás", () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken(generateToken(), hash)).toBe(false);
    expect(verifyToken(token, "no-es-hex")).toBe(false);
  });
});
