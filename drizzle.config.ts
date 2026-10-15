import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { pgConfigFromUrl } from "./src/lib/db/connection";

// Carga .env.local igual que Next.js.
loadEnvConfig(process.cwd());

// Las migraciones van por la conexión sin pooler de transacción (session/direct).
const url =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "";

function credentials() {
  if (!url) return { url: "" };
  const { connectionString, ssl } = pgConfigFromUrl(url);
  if (!ssl) return { url: connectionString! };
  // Con SSL hay que pasar los datos sueltos para poder configurar el certificado.
  const parsed = new URL(connectionString!);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1) || "postgres",
    ssl: ssl as { rejectUnauthorized: boolean; ca?: string },
  };
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: credentials(),
  strict: true,
  verbose: true,
});
