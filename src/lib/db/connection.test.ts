import { describe, expect, it } from "vitest";

import { pgConfigFromUrl } from "./connection";

describe("pgConfigFromUrl", () => {
  it("no usa SSL en local", () => {
    const c = pgConfigFromUrl("postgres://postgres@localhost:5432/dogwhere", undefined);
    expect(c.ssl).toBeUndefined();
  });

  it("en Supabase quita sslmode y usa SSL sin verificar si no hay CA", () => {
    const c = pgConfigFromUrl(
      "postgres://user:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
      undefined,
    );
    expect(c.connectionString).not.toContain("sslmode");
    expect(c.connectionString).toContain("supa=base-pooler.x");
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("verifica el certificado si se proporciona la CA", () => {
    const c = pgConfigFromUrl(
      "postgres://u:p@db.example.supabase.co:5432/postgres",
      "-----BEGIN\\nX",
    );
    expect(c.ssl).toEqual({ ca: "-----BEGIN\nX", rejectUnauthorized: true });
  });
});
