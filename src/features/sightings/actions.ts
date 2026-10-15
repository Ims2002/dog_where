"use server";

import { count, eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { POSTS_TAG, postTag } from "@/features/posts/constants";
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { posts, sightings } from "@/lib/db/schema";

import { MAX_SIGHTINGS_PER_POST } from "./constants";
import { createSightingSchema, type CreateSightingInput } from "./validation";

/** Añade un punto al reguero de un animal sin capturar. Cualquiera puede hacerlo. */
export async function createSighting(input: CreateSightingInput): Promise<ActionResult> {
  const parsed = createSightingSchema.safeParse(input);
  if (!parsed.success) return failValidation(parsed.error);
  const d = parsed.data;

  const db = getDb();
  const [post] = await db
    .select({ status: posts.status, custody: posts.custody })
    .from(posts)
    .where(eq(posts.id, d.postId));
  if (!post || post.status !== "active") return fail("Esta publicación ya no está activa.");
  if (post.custody !== "not_caught") {
    return fail("Este animal ya no está suelto: no hace falta añadir avistamientos.");
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(sightings)
    .where(eq(sightings.postId, d.postId));
  if (total >= MAX_SIGHTINGS_PER_POST) {
    return fail("Esta publicación ha alcanzado el máximo de avistamientos.");
  }

  await db.insert(sightings).values({
    postId: d.postId,
    lat: d.location.lat,
    lng: d.location.lng,
    seenAt: d.seenAt,
    note: d.note || null,
    photoUrl: d.photoUrl ?? null,
    photoPathname: d.photoPathname ?? null,
    reporterName: d.reporterName || null,
  });

  updateTag(POSTS_TAG);
  updateTag(postTag(d.postId));
  return ok(undefined);
}
