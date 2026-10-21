/**
 * Qué métodos de acceso están activos. Un proveedor social solo se activa (y su botón
 * solo aparece) si sus credenciales están en las variables de entorno.
 */
export const SOCIAL_PROVIDERS = ["google", "apple"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

type Env = Record<string, string | undefined>;

export function googleCredentials(e: Env = process.env) {
  const clientId = e.GOOGLE_CLIENT_ID;
  const clientSecret = e.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Apple necesita el Service ID, el Team ID, el Key ID y la clave privada .p8. */
export function appleCredentials(e: Env = process.env) {
  const clientId = e.APPLE_CLIENT_ID;
  const teamId = e.APPLE_TEAM_ID;
  const keyId = e.APPLE_KEY_ID;
  const privateKey = e.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return clientId && teamId && keyId && privateKey ? { clientId, teamId, keyId, privateKey } : null;
}

/**
 * Email + contraseña necesita poder enviar emails (verificación y recuperación).
 * En producción sin RESEND_API_KEY se oculta; en local los enlaces salen en la terminal.
 */
export function emailPasswordEnabled(e: Env = process.env): boolean {
  return !!e.RESEND_API_KEY || e.NODE_ENV !== "production";
}

export function enabledSocialProviders(e: Env = process.env): SocialProvider[] {
  return SOCIAL_PROVIDERS.filter((p) =>
    p === "google" ? googleCredentials(e) !== null : appleCredentials(e) !== null,
  );
}
