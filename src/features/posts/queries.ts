import "server-only";

import { and, between, count, desc, eq, inArray, max, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { toPublicSighting, type PublicSighting } from "@/features/sightings/mappers";
import { getDb } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { posts, shelters, sightings, type Post, type Shelter } from "@/lib/db/schema";
import { distanceKm } from "@/lib/geo";
import { verifyToken } from "@/lib/tokens";

import { POSTS_TAG, postTag, type CustodyStatus, type Species } from "./constants";
import { toPublicPost, type PublicPost } from "./mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const log = createLogger("posts");

export type PostFilters = {
  species?: Species;
  custody?: CustodyStatus;
  near?: { lat: number; lng: number; radiusKm: number };
};

export type PostListItem = PublicPost & {
  distanceKm: number | null;
  sightingsCount: number;
  lastSeenAt: string;
};

async function withShelters(rows: Post[]): Promise<Map<string, Shelter>> {
  const ids = [...new Set(rows.map((r) => r.shelterId).filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();
  const list = await getDb().select().from(shelters).where(inArray(shelters.id, ids));
  return new Map(list.map((s) => [s.id, s]));
}

/** Publicaciones activas, filtradas y ordenadas (por cercanía si hay ubicación). */
export async function listActivePosts(filters: PostFilters = {}): Promise<PostListItem[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");

  const where: SQL[] = [eq(posts.status, "active")];
  if (filters.species) where.push(eq(posts.species, filters.species));
  if (filters.custody) where.push(eq(posts.custody, filters.custody));

  const near = filters.near;
  if (near) {
    // Caja de coordenadas aproximada; el radio exacto se aplica después con Haversine.
    const dLat = near.radiusKm / 111;
    const dLng = near.radiusKm / (111 * Math.cos((near.lat * Math.PI) / 180));
    where.push(between(posts.foundLat, near.lat - dLat, near.lat + dLat));
    where.push(between(posts.foundLng, near.lng - dLng, near.lng + dLng));
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(posts)
    .where(and(...where))
    .orderBy(desc(posts.createdAt))
    .limit(100);
  if (rows.length === 0) return [];

  const [shelterById, stats] = await Promise.all([
    withShelters(rows),
    db
      .select({ postId: sightings.postId, total: count(), last: max(sightings.seenAt) })
      .from(sightings)
      .where(
        inArray(
          sightings.postId,
          rows.map((r) => r.id),
        ),
      )
      .groupBy(sightings.postId),
  ]);
  const statsById = new Map(stats.map((s) => [s.postId, s]));

  const items = rows.map((row) => {
    const s = statsById.get(row.id);
    const lastSeen = s?.last && s.last > row.seenAt ? s.last : row.seenAt;
    return {
      ...toPublicPost(row, row.shelterId ? (shelterById.get(row.shelterId) ?? null) : null),
      // La distancia se calcula con la ubicación exacta, pero solo se publica el número.
      distanceKm: near ? distanceKm(near, { lat: row.foundLat, lng: row.foundLng }) : null,
      sightingsCount: s?.total ?? 0,
      lastSeenAt: lastSeen.toISOString(),
    };
  });

  if (!near) return items;
  return items
    .filter((i) => (i.distanceKm ?? 0) <= near.radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export type PostDetail = { post: PublicPost; sightings: PublicSighting[] };

/** Detalle público. Las archivadas no se muestran. */
export async function getPostDetail(id: string): Promise<PostDetail | null> {
  "use cache";
  cacheTag(POSTS_TAG, postTag(id));
  cacheLife("minutes");

  if (!UUID_RE.test(id)) return null;
  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  if (!row || row.status === "archived") return null;

  const [shelter, trail] = await Promise.all([
    row.shelterId
      ? db
          .select()
          .from(shelters)
          .where(eq(shelters.id, row.shelterId))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db.select().from(sightings).where(eq(sightings.postId, id)).orderBy(sightings.seenAt),
  ]);

  return { post: toPublicPost(row, shelter), sightings: trail.map(toPublicSighting) };
}

/**
 * Carga una publicación para gestionarla, solo si el token es correcto.
 * Sin "use cache" (depende de un secreto); `cache` de React solo evita repetir la
 * consulta dentro de la misma petición.
 */
export const getPostForManagement = cache(async (id: string, token: string) => {
  if (!UUID_RE.test(id)) return null;
  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  if (!row || row.status === "archived" || !verifyToken(token, row.manageTokenHash)) {
    // Un enlace mal copiado… o alguien probando tokens: interesa poder verlo.
    log.warn("manage.unauthorized", {
      postId: id,
      reason: !row ? "not_found" : row.status === "archived" ? "archived" : "bad_token",
    });
    return null;
  }
  return withShelter(row);
});

/** Lo mismo para el autor con sesión iniciada: gestiona sus publicaciones sin el enlace. */
export const getOwnPostForManagement = cache(async (id: string, userId: string) => {
  if (!UUID_RE.test(id)) return null;
  const [row] = await getDb().select().from(posts).where(eq(posts.id, id));
  if (!row || row.status === "archived" || row.authorId !== userId) {
    log.warn("manage.unauthorized", {
      postId: id,
      reason: !row ? "not_found" : row.status === "archived" ? "archived" : "not_author",
    });
    return null;
  }
  return withShelter(row);
});

async function withShelter(row: Post) {
  const shelter = row.shelterId
    ? ((await getDb().select().from(shelters).where(eq(shelters.id, row.shelterId)))[0] ?? null)
    : null;
  return { row, post: toPublicPost(row, shelter) };
}

export { UUID_RE };
