import { describe, expect, it } from "vitest";

import { authBaseUrl, authTrustedOrigins } from "./env";

describe("authBaseUrl", () => {
  it("en producción de Vercel usa su dominio aunque NEXT_PUBLIC_SITE_URL esté mal", () => {
    expect(
      authBaseUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "dogwhere-three.vercel.app",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://dogwhere-three.vercel.app");
  });

  it("BETTER_AUTH_URL manda y se quita la barra final", () => {
    expect(authBaseUrl({ BETTER_AUTH_URL: "https://dogwhere.es/", VERCEL_ENV: "production" })).toBe(
      "https://dogwhere.es",
    );
  });

  it("previews y local", () => {
    expect(authBaseUrl({ VERCEL_ENV: "preview", VERCEL_URL: "dogwhere-abc.vercel.app" })).toBe(
      "https://dogwhere-abc.vercel.app",
    );
    expect(authBaseUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" })).toBe(
      "http://localhost:3000",
    );
    expect(authBaseUrl({})).toBe("http://localhost:3000");
  });
});

describe("authTrustedOrigins", () => {
  it("incluye todas las URLs del despliegue, sin duplicados", () => {
    expect(
      authTrustedOrigins({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "dogwhere-three.vercel.app",
        VERCEL_URL: "dogwhere-x1.vercel.app",
        VERCEL_BRANCH_URL: "dogwhere-git-main.vercel.app",
        NEXT_PUBLIC_SITE_URL: "https://dogwhere-three.vercel.app/",
      }),
    ).toEqual([
      "https://dogwhere-three.vercel.app",
      "https://dogwhere-x1.vercel.app",
      "https://dogwhere-git-main.vercel.app",
      "https://appleid.apple.com",
    ]);
  });
});
