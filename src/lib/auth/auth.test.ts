import { generateKeyPairSync, verify } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createAppleClientSecret } from "./apple-secret";
import { emailPasswordEnabled, enabledSocialProviders } from "./providers";

describe("enabledSocialProviders", () => {
  it("solo activa los proveedores con credenciales completas", () => {
    expect(enabledSocialProviders({})).toEqual([]);
    expect(enabledSocialProviders({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toEqual([
      "google",
    ]);
    // Apple a medias (sin clave) sigue oculto
    expect(
      enabledSocialProviders({ APPLE_CLIENT_ID: "a", APPLE_TEAM_ID: "b", APPLE_KEY_ID: "c" }),
    ).toEqual([]);
    expect(
      enabledSocialProviders({
        GOOGLE_CLIENT_ID: "a",
        GOOGLE_CLIENT_SECRET: "b",
        APPLE_CLIENT_ID: "a",
        APPLE_TEAM_ID: "b",
        APPLE_KEY_ID: "c",
        APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nX",
      }),
    ).toEqual(["google", "apple"]);
  });
});

describe("emailPasswordEnabled", () => {
  it("en producción solo con Resend; en local siempre", () => {
    expect(emailPasswordEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(emailPasswordEnabled({ NODE_ENV: "production", RESEND_API_KEY: "re_x" })).toBe(true);
    expect(emailPasswordEnabled({ NODE_ENV: "development" })).toBe(true);
  });
});

describe("createAppleClientSecret", () => {
  it("genera un JWT ES256 válido con los claims que pide Apple", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const now = Date.UTC(2026, 9, 21);
    const jwt = createAppleClientSecret({
      clientId: "com.dogwhere.web",
      teamId: "TEAM123456",
      keyId: "KEY1234567",
      privateKey: pem,
      now,
    });

    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "KEY1234567",
    });
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(payload).toMatchObject({
      iss: "TEAM123456",
      sub: "com.dogwhere.web",
      aud: "https://appleid.apple.com",
    });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(15_777_000);

    const ok = verify(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(s, "base64url"),
    );
    expect(ok).toBe(true);
  });
});
