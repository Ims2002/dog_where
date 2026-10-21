import { createPrivateKey, sign } from "node:crypto";

const APPLE_AUDIENCE = "https://appleid.apple.com";
/** Apple permite como máximo 6 meses; cada instancia del servidor genera el suyo al arrancar. */
const VALIDITY_SECONDS = 180 * 24 * 3600;

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/**
 * "Client secret" de Sign in with Apple: un JWT ES256 firmado con la clave .p8.
 * Se genera aquí para no tener que renovarlo a mano cada 6 meses.
 */
export function createAppleClientSecret(opts: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  now?: number;
}): string {
  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: opts.keyId }));
  const payload = b64url(
    JSON.stringify({
      iss: opts.teamId,
      iat,
      exp: iat + VALIDITY_SECONDS,
      aud: APPLE_AUDIENCE,
      sub: opts.clientId,
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(opts.privateKey),
    dsaEncoding: "ieee-p1363", // formato que exige JWS para ES256
  });
  return `${header}.${payload}.${b64url(signature)}`;
}
