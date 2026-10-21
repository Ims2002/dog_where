import "server-only";

import { desc, eq, inArray, isNotNull, and } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { getDb } from "@/lib/db";
import { posts, shelters, sightings, type Shelter } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { deletePhotos } from "@/lib/storage";

import { POSTS_TAG, postTag } from "./constants";
import { toPublicPost, type PublicPost } from "./mappers";

const log = createLogger("posts");

/** Publicaciones de un usuario con sesión (todas, también las archivadas). */
export async function listPostsByAuthor(userId: string): Promise<PublicPost[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt))
    .limit(100);
  const shelterIds = [...new Set(rows.map((r) => r.shelterId).filter((id): id is string => !!id))];
  const shelterById = new Map<string, Shelter>(
    shelterIds.length
      ? (await db.select().from(shelters).where(inArray(shelters.id, shelterIds))).map((s) => [
          s.id,
          s,
        ])
      : [],
  );
  return rows.map((r) =>
    toPublicPost(r, r.shelterId ? (shelterById.get(r.shelterId) ?? null) : null),
  );
}

/**
 * Borra todas las publicaciones de un usuario y sus fotos (al borrar la cuenta).
 * Llevan su nombre y su contacto: no tiene sentido que sobrevivan a la cuenta.
 */
export async function deletePostsByAuthor(userId: string) {
  const db = getDb();
  const own = await db
    .select({ id: posts.id, photoPathname: posts.photoPathname })
    .from(posts)
    .where(eq(posts.authorId, userId));
  if (own.length === 0) return { posts: 0 };

  const ids = own.map((p) => p.id);
  const sightingPhotos = await db
    .select({ pathname: sightings.photoPathname })
    .from(sightings)
    .where(and(inArray(sightings.postId, ids), isNotNull(sightings.photoPathname)));

  // Avistamientos y denuncias se borran en cascada.
  await db.delete(posts).where(inArray(posts.id, ids));
  await deletePhotos([
    ...own.map((p) => p.photoPathname),
    ...sightingPhotos.map((s) => s.pathname ?? ""),
  ]);

  // Se llama desde el endpoint de Better Auth (no es una Server Action): sin updateTag.
  revalidateTag(POSTS_TAG, { expire: 0 });
  for (const id of ids) revalidateTag(postTag(id), { expire: 0 });

  log.info("posts.deleted_with_account", {
    count: ids.length,
    sightingPhotos: sightingPhotos.length,
  });
  return { posts: ids.length };
}
