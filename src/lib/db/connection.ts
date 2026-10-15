import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Convierte una URL de Postgres en la configuración de `pg`, resolviendo el SSL.
 *
 * Supabase firma sus certificados con su propia CA. Con `sslmode=require`, `pg`
 * exige verificación completa y la conexión falla ("self-signed certificate in
 * certificate chain"). Por eso:
 * - Local (localhost) → sin SSL.
 * - Con DATABASE_CA_CERT (el certificado que descargas en Supabase) → SSL verificado.
 * - Sin él → SSL cifrado sin verificar la CA (lo mismo que `sslmode=require` en libpq).
 */
export function pgConfigFromUrl(url: string, caCert = process.env.DATABASE_CA_CERT): PoolConfig {
  const parsed = new URL(url);
  // Nos encargamos del SSL nosotros: quitamos los parámetros que lo reinterpretan.
  for (const param of ["sslmode", "sslrootcert", "uselibpqcompat"]) {
    parsed.searchParams.delete(param);
  }

  const config: PoolConfig = { connectionString: parsed.toString() };
  if (LOCAL_HOSTS.has(parsed.hostname)) return config;

  config.ssl = caCert
    ? { ca: caCert.replace(/\\n/g, "\n"), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
  return config;
}
