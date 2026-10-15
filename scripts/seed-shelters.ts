/**
 * Carga (o actualiza) las protectoras de data/shelters.json en la base de datos.
 *
 *   npm run db:seed:shelters            (usa data/shelters.json)
 *   npm run db:seed:shelters -- otra.json
 *
 * - Valida cada entrada con createShelterSchema.
 * - Si una entrada no trae `location`, la geocodifica con Nominatim (OpenStreetMap).
 *   Si solo se encuentra la localidad, la protectora queda en "pending" para revisarla.
 * - `location` puede ser { "lat": …, "lng": … } o el texto que copia Google Maps al hacer
 *   clic derecho en un punto: "38.8433, -0.1172".
 * - Busca por nombre: si ya existe, la actualiza; si no, la crea.
 * - El JSON manda: las protectoras de la BD que ya no están en él se borran (o, si alguna
 *   publicación apunta a ellas, se desactivan para no romper esas publicaciones).
 * - Al final imprime un enlace a Google Maps de cada una para comprobar la ubicación.
 */
import { readFile } from "node:fs/promises";

import { loadEnvConfig } from "@next/env";
import { eq, inArray, notInArray } from "drizzle-orm";

import { createShelterSchema } from "../src/features/shelters/validation";
import { createDbClient } from "../src/lib/db/client";
import { posts, shelters } from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

type Coords = { lat: number; lng: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Acepta { lat, lng } o "lat, lng" (lo que copia Google Maps). */
function parseLocation(value: unknown): Coords | undefined {
  if (typeof value === "string") {
    const [lat, lng] = value.split(",").map((n) => Number(n.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  }
  if (value && typeof value === "object" && "lat" in value && "lng" in value) {
    return value as Coords;
  }
  return undefined;
}

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
    let location = parseLocation(entry.location);
    const status = entry.status;
    let precision = "coordenadas del JSON";

    if (!location) {
      const address = String(entry.address);
      // Primero la dirección completa; después sin número ni código postal (las "Partida …"
      // y polígonos suelen estar en OpenStreetMap solo por su nombre).
      const attempts = [
        `${address}, Alicante, España`,
        `${address.replace(/\b\d{5}\b/g, "").replace(/,?\s*\d+[A-Za-z]?\b/g, "").replace(/\s+/g, " ")}, ${entry.locality}, Alicante, España`,
      ];
      for (const q of attempts) {
        location = (await geocode(q)) ?? undefined;
        if (location) break;
      }
      precision = "dirección geocodificada";
      if (!location) {
        // Último recurso: el centro de la localidad. Se publica igual (la ficha muestra la
        // dirección y "Cómo llegar" usa la dirección), pero conviene poner las coordenadas.
        location = (await geocode(`${entry.locality}, Alicante, España`)) ?? undefined;
        precision = '⚠ APROXIMADA (centro de la localidad): añade "location" en el JSON';
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

  // Protectoras que ya no están en el JSON
  const names = raw.map((e) => String(e.name));
  const leftovers = await db
    .select({ id: shelters.id, name: shelters.name })
    .from(shelters)
    .where(names.length ? notInArray(shelters.name, names) : undefined);
  if (leftovers.length > 0) {
    const used = await db
      .selectDistinct({ id: posts.shelterId })
      .from(posts)
      .where(
        inArray(
          posts.shelterId,
          leftovers.map((l) => l.id),
        ),
      );
    const usedIds = new Set(used.map((u) => u.id));
    for (const l of leftovers) {
      if (usedIds.has(l.id)) {
        await db.update(shelters).set({ status: "disabled" }).where(eq(shelters.id, l.id));
        report.push(`⊘ ${l.name}: ya no está en el JSON → desactivada (tiene publicaciones)`);
      } else {
        await db.delete(shelters).where(eq(shelters.id, l.id));
        report.push(`− ${l.name}: ya no está en el JSON → borrada`);
      }
    }
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
