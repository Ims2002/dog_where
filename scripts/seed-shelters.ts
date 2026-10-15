/**
 * Carga (o actualiza) las protectoras de data/shelters.json en la base de datos.
 *
 *   npm run db:seed:shelters            (usa data/shelters.json)
 *   npm run db:seed:shelters -- otra.json
 *
 * - Valida cada entrada con createShelterSchema.
 * - Si una entrada no trae `location`, la geocodifica con Nominatim (OpenStreetMap).
 *   Si solo se encuentra la localidad, la protectora queda en "pending" para revisarla.
 * - Busca por nombre: si ya existe, la actualiza; si no, la crea.
 * - Al final imprime un enlace a Google Maps de cada una para comprobar la ubicación.
 */
import { readFile } from "node:fs/promises";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { createShelterSchema } from "../src/features/shelters/validation";
import { createDbClient } from "../src/lib/db/client";
import { shelters } from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

type Coords = { lat: number; lng: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(query: string): Promise<Coords | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "es");
  const res = await fetch(url, { headers: { "User-Agent": "DogWhere/0.1 (seed de protectoras)" } });
  await sleep(1100); // política de uso de Nominatim: máx. 1 petición/segundo
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta POSTGRES_URL (¿has hecho `vercel env pull .env.local`?)");
  const db = createDbClient(url);

  const raw = JSON.parse(await readFile(process.argv[2] ?? "data/shelters.json", "utf8")) as Record<
    string,
    unknown
  >[];
  const report: string[] = [];

  for (const entry of raw) {
    let location = entry.location as Coords | undefined;
    let status = entry.status;
    let precision = "coordenadas del JSON";

    if (!location) {
      location = (await geocode(`${entry.address}, España`)) ?? undefined;
      precision = "dirección geocodificada";
      if (!location) {
        location = (await geocode(`${entry.locality}, Alicante, España`)) ?? undefined;
        precision = "solo localidad → queda pendiente";
        status = "pending";
      }
      if (!location) {
        report.push(`✗ ${entry.name}: no se pudo geocodificar, se omite`);
        continue;
      }
    }

    const parsed = createShelterSchema.safeParse({ ...entry, location, status });
    if (!parsed.success) {
      report.push(`✗ ${entry.name}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      continue;
    }
    const d = parsed.data;
    const values = {
      kind: d.kind,
      status: d.status,
      name: d.name,
      address: d.address,
      locality: d.locality,
      lat: d.location.lat,
      lng: d.location.lng,
      phone: d.phone ?? null,
      email: d.email ?? null,
      website: d.website ?? null,
      openingHours: d.openingHours ?? null,
      acceptsDropOff: d.acceptsDropOff,
      dropOffNotes: d.dropOffNotes ?? null,
    };

    const [existing] = await db
      .select({ id: shelters.id })
      .from(shelters)
      .where(eq(shelters.name, d.name));
    if (existing) {
      await db.update(shelters).set(values).where(eq(shelters.id, existing.id));
    } else {
      await db.insert(shelters).values(values);
    }
    report.push(
      `${existing ? "↻" : "+"} ${d.name} [${d.status}] (${precision}) https://www.google.com/maps?q=${d.location.lat},${d.location.lng}`,
    );
  }

  console.log(report.join("\n"));
  console.log(
    "\nRevisa en el mapa que cada ubicación es correcta antes de dar el lanzamiento por bueno.",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
