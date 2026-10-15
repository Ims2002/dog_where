"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";

import { findApprovedShelter } from "@/features/shelters/queries";
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { posts, reports, sightings } from "@/lib/db/schema";
import { deletePhotos, putPhoto } from "@/lib/storage";
import { generateToken, hashToken } from "@/lib/tokens";

import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  POST_TTL_DAYS,
  POSTS_TAG,
  postTag,
  REPORT_REASONS,
} from "./constants";
import { getPostForManagement } from "./queries";
import { updateCustodySchema, validateCreatePost, type CreatePostInput } from "./validation";

const DAY_MS = 86_400_000;
/** Tras marcarse como reunida, la publicación se archiva a los 7 días. */
const REUNITED_GRACE_DAYS = 7;

/* ---------------------------------------------------------------- fotos */

const photoFolderSchema = z.enum(["posts", "sightings"]);

/** Sube una foto (ya comprimida en el cliente). Devuelve su URL y pathname. */
export async function uploadPhoto(
  formData: FormData,
): Promise<ActionResult<{ url: string; pathname: string }>> {
  const file = formData.get("file");
  const folder = photoFolderSchema.safeParse(formData.get("folder"));
  if (!(file instanceof File) || !folder.success) return fail("No se ha recibido ninguna foto.");
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return fail("La foto tiene que ser JPG, PNG o WebP.");
  }
  if (file.size > MAX_PHOTO_BYTES) return fail("La foto pesa demasiado. Prueba con otra.");

  try {
    return ok(await putPhoto(file, folder.data));
  } catch (error) {
    console.error("uploadPhoto", error);
    return fail("No se ha podido subir la foto. Inténtalo de nuevo.");
  }
}

/* ------------------------------------------------------------- publicar */

export async function createPost(
  input: CreatePostInput,
): Promise<ActionResult<{ id: string; manageToken: string }>> {
  const parsed = validateCreatePost(input);
  if (!parsed.success) return failValidation(parsed.error);
  const d = parsed.data;

  if (d.custody === "at_shelter" && !(await findApprovedShelter(d.shelterId))) {
    return fail("Esa protectora no está disponible.", { shelterId: "Elige otra protectora" });
  }

  const manageToken = generateToken();
  const [created] = await getDb()
    .insert(posts)
    .values({
      species: d.species,
      description: d.description,
      photoUrl: d.photoUrl,
      photoPathname: d.photoPathname,
      hasTag: d.hasTag,
      tagText: d.hasTag ? (d.tagText ?? null) : null,
      tagPhone: d.hasTag ? (d.tagPhone ?? null) : null,
      foundLat: d.foundLocation.lat,
      foundLng: d.foundLocation.lng,
      locality: d.locality,
      seenAt: d.seenAt,
      custody: d.custody,
      shelterId: d.custody === "at_shelter" ? d.shelterId : null,
      custodyLat: d.custody === "with_finder" ? (d.custodyLocation?.lat ?? null) : null,
      custodyLng: d.custody === "with_finder" ? (d.custodyLocation?.lng ?? null) : null,
      finderName: d.finderName,
      finderContact: d.finderContact,
      manageTokenHash: hashToken(manageToken),
      expiresAt: new Date(Date.now() + POST_TTL_DAYS * DAY_MS),
    })
    .returning({ id: posts.id });

  updateTag(POSTS_TAG);
  return ok({ id: created.id, manageToken });
}

/* ---------------------------------------------- gestión (enlace secreto) */

async function authorize(id: string, token: string) {
  const found = await getPostForManagement(id, token);
  return found?.row ?? null;
}

function invalidate(id: string) {
  updateTag(POSTS_TAG);
  updateTag(postTag(id));
}

export async function updateCustody(
  id: string,
  token: string,
  input: unknown,
): Promise<ActionResult> {
  const row = await authorize(id, token);
  if (!row) return fail("El enlace de gestión no es válido.");
  const parsed = updateCustodySchema.safeParse(input);
  if (!parsed.success) return failValidation(parsed.error);
  const d = parsed.data;

  if (d.custody === "at_shelter" && !(await findApprovedShelter(d.shelterId))) {
    return fail("Esa protectora no está disponible.", { shelterId: "Elige otra protectora" });
  }

  await getDb()
    .update(posts)
    .set({
      custody: d.custody,
      shelterId: d.custody === "at_shelter" ? d.shelterId : null,
      custodyLat: d.custody === "with_finder" ? (d.custodyLocation?.lat ?? null) : null,
      custodyLng: d.custody === "with_finder" ? (d.custodyLocation?.lng ?? null) : null,
    })
    .where(eq(posts.id, id));

  invalidate(id);
  return ok(undefined);
}

export async function markReunited(id: string, token: string): Promise<ActionResult> {
  const row = await authorize(id, token);
  if (!row) return fail("El enlace de gestión no es válido.");

  await getDb()
    .update(posts)
    .set({
      status: "reunited",
      expiresAt: new Date(Date.now() + REUNITED_GRACE_DAYS * DAY_MS),
    })
    .where(eq(posts.id, id));

  invalidate(id);
  return ok(undefined);
}

export async function deletePost(id: string, token: string): Promise<ActionResult> {
  const row = await authorize(id, token);
  if (!row) return fail("El enlace de gestión no es válido.");

  const db = getDb();
  const sightingPhotos = await db
    .select({ pathname: sightings.photoPathname })
    .from(sightings)
    .where(and(eq(sightings.postId, id), isNotNull(sightings.photoPathname)));

  // Los avistamientos y denuncias se borran en cascada.
  await db.delete(posts).where(eq(posts.id, id));
  await deletePhotos([row.photoPathname, ...sightingPhotos.map((s) => s.pathname ?? "")]);

  invalidate(id);
  return ok(undefined);
}

/* ------------------------------------------------------------ denunciar */

const reportSchema = z.object({
  postId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

export async function reportPost(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return failValidation(parsed.error);
  const d = parsed.data;

  const [exists] = await getDb().select({ id: posts.id }).from(posts).where(eq(posts.id, d.postId));
  if (!exists) return fail("Esta publicación ya no existe.");

  await getDb()
    .insert(reports)
    .values({ postId: d.postId, reason: d.reason, details: d.details ?? null });
  return ok(undefined);
}
