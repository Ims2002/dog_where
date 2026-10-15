import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";
import { shelters } from "@/lib/db/schema";

import { toPublicShelter, type PublicShelter } from "./mappers";

export const SHELTERS_TAG = "shelters";

/** Protectoras aprobadas (las únicas visibles y seleccionables). */
export async function listApprovedShelters(): Promise<PublicShelter[]> {
  "use cache";
  cacheTag(SHELTERS_TAG);
  cacheLife("minutes");

  const rows = await getDb()
    .select()
    .from(shelters)
    .where(eq(shelters.status, "approved"))
    .orderBy(asc(shelters.locality), asc(shelters.name));
  return rows.map(toPublicShelter);
}

/** Devuelve la protectora solo si existe y está aprobada (sin caché: se usa al escribir). */
export async function findApprovedShelter(id: string) {
  const [row] = await getDb()
    .select()
    .from(shelters)
    .where(and(eq(shelters.id, id), eq(shelters.status, "approved")));
  return row ?? null;
}
