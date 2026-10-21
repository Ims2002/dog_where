/**
 * Muestra a qué base de datos apunta .env.local (sin contraseña), qué migraciones
 * se han aplicado y qué tablas existen. Útil para comprobar que local y Vercel coinciden.
 *
 *   npm run db:status
 */
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

import { pgConfigFromUrl } from "../src/lib/db/connection";

loadEnvConfig(process.cwd());

const EXPECTED = [
  "accounts",
  "posts",
  "rate_limits",
  "reports",
  "sessions",
  "shelters",
  "sightings",
  "users",
  "verifications",
];

async function main() {
  const name = process.env.POSTGRES_URL_NON_POOLING
    ? "POSTGRES_URL_NON_POOLING"
    : process.env.DATABASE_URL
      ? "DATABASE_URL"
      : "POSTGRES_URL";
  const url = process.env[name];
  if (!url)
    throw new Error("No hay POSTGRES_URL_NON_POOLING, DATABASE_URL ni POSTGRES_URL en .env.local");

  const parsed = new URL(url);
  // El usuario de Supabase lleva el id del proyecto (postgres.<id>): sirve para comparar.
  process.stdout.write(`Base de datos: ${parsed.username}@${parsed.hostname} (${name})\n\n`);

  const pool = new Pool({ ...pgConfigFromUrl(url), max: 1 });
  try {
    const migrations = await pool
      .query<{ n: string }>("select count(*)::text as n from drizzle.__drizzle_migrations")
      .then((r) => Number(r.rows[0].n))
      .catch(() => 0);
    process.stdout.write(`Migraciones aplicadas: ${migrations} de 4\n`);

    const { rows } = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const present = new Set(rows.map((r) => r.table_name));
    for (const t of EXPECTED) process.stdout.write(`  ${present.has(t) ? "✓" : "✗"} ${t}\n`);
    const missing = EXPECTED.filter((t) => !present.has(t));
    process.stdout.write(
      missing.length
        ? `\nFaltan ${missing.length} tablas: ejecuta npm run db:migrate\n`
        : "\nTodo en orden.\n",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
