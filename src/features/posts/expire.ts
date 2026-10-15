import "server-only";

import { and, inArray, isNotNull, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { posts, sightings } from "@/lib/db/schema";
import { deletePhotos } from "@/lib/storage";

/**
 * Archiva las publicaciones caducadas y borra sus datos privados:
 * datos de chapa, ubicación de la casa, fotos y avistamientos.
 * Se conserva la ficha mínima (especie, localidad, fechas) por si hay que atender
 * una denuncia; la foto y el reguero se eliminan.
 */
export async function archiveExpiredPosts(now = new Date()) {
  const db = getDb();
  const expired = await db
    .select({ id: posts.id, photoPathname: posts.photoPathname })
    .from(posts)
    .where(and(inArray(posts.status, ["active", "reunited"]), lt(posts.expiresAt, now)));
  if (expired.length === 0) return { archived: 0 };

  const ids = expired.map((p) => p.id);
  const sightingPhotos = await db
    .select({ pathname: sightings.photoPathname })
    .from(sightings)
    .where(and(inArray(sightings.postId, ids), isNotNull(sightings.photoPathname)));

  await db.delete(sightings).where(inArray(sightings.postId, ids));
  await db
    .update(posts)
    .set({
      status: "archived",
      tagText: null,
      tagPhone: null,
      custodyLat: null,
      custodyLng: null,
      // custody_location_chk exige que, sin ubicación, no haya coordenadas: se cumple.
    })
    .where(inArray(posts.id, ids));

  await deletePhotos([
    ...expired.map((p) => p.photoPathname),
    ...sightingPhotos.map((s) => s.pathname ?? ""),
  ]);
  return { archived: ids.length };
}
