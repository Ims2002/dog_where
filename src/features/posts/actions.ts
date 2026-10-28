"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";

import { findApprovedShelter } from "@/features/shelters/queries";
import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result";
import { guardAction } from "@/lib/anti-spam";
import type { HoneypotInput } from "@/lib/anti-spam/limits";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { runAction } from "@/lib/logger/action";
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
import { getOwnPostForManagement, getPostForManagement } from "./queries";
import { updateCustodySchema, validateCreatePost, type CreatePostInput } from "./validation";

const log = createLogger("posts");

const DAY_MS = 86_400_000;
/** Tras marcarse como reunida, la publicación se archiva a los 7 días. */
const REUNITED_GRACE_DAYS = 7;

/* ---------------------------------------------------------------- fotos */

const photoFolderSchema = z.enum(["posts", "sightings"]);

/** Sube una foto (ya comprimida en el cliente). Devuelve su URL y pathname. */
export async function uploadPhoto(
  formData: FormData,
): Promise<ActionResult<{ url: string; pathname: string }>> {
  return runAction("photo.upload", async () => {
    const blocked = await guardAction("photo.upload");
    if (blocked) return blocked;
    const file = formData.get("file");
    const folder = photoFolderSchema.safeParse(formData.get("folder"));
    if (!(file instanceof File) || !folder.success) return fail("No se ha recibido ninguna foto.");
    if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      log.warn("photo.rejected", { reason: "type", type: file.type });
      return fail("La foto tiene que ser JPG, PNG o WebP.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      log.warn("photo.rejected", { reason: "size", bytes: file.size });
      return fail("La foto pesa demasiado. Prueba con otra.");
    }

    try {
      const stored = await putPhoto(file, folder.data);
      log.info("photo.uploaded", { folder: folder.data, type: file.type, bytes: file.size });
      return ok(stored);
    } catch (error) {
      log.error("photo.upload_failed", { folder: folder.data, bytes: file.size }, error);
      return fail("No se ha podido subir la foto. Inténtalo de nuevo.");
    }
  });
}

/* ------------------------------------------------------------- publicar */

export async function createPost(
  input: CreatePostInput & HoneypotInput,
): Promise<ActionResult<{ id: string; manageToken: string }>> {
  return runAction("post.create", async () => {
    const blocked = await guardAction("post.create", input);
    if (blocked) return blocked;
    const parsed = validateCreatePost(input);
    if (!parsed.success) return failValidation(parsed.error);
    const d = parsed.data;

    if (d.custody === "at_shelter" && !(await findApprovedShelter(d.shelterId))) {
      log.warn("post.shelter_unavailable", { shelterId: d.shelterId });
      return fail("Esa protectora no está disponible.", { shelterId: "Elige otra protectora" });
    }

    const manageToken = generateToken();
    const user = await getCurrentUser();
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
        authorId: user?.id ?? null,
        expiresAt: new Date(Date.now() + POST_TTL_DAYS * DAY_MS),
      })
      .returning({ id: posts.id });

    log.info("post.created", {
      postId: created.id,
      species: d.species,
      custody: d.custody,
      shelterId: d.custody === "at_shelter" ? d.shelterId : undefined,
      hasTag: d.hasTag,
      hasHomeLocation: d.custody === "with_finder" && !!d.custodyLocation,
      withAccount: !!user,
    });
    updateTag(POSTS_TAG);
    return ok({ id: created.id, manageToken });
  });
}

/* ---------------------------------------------- gestión (enlace secreto) */

/**
 * Quién puede gestionar: quien tiene el enlace secreto (token) o, si `token` está vacío,
 * el autor con la sesión iniciada (desde «Mi cuenta»).
 */
async function authorize(id: string, token: string) {
  if (token) return (await getPostForManagement(id, token))?.row ?? null;
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getOwnPostForManagement(id, user.id))?.row ?? null;
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
  return runAction("post.update_custody", async () => {
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

    log.info("post.custody_updated", { postId: id, from: row.custody, to: d.custody });
    invalidate(id);
    return ok(undefined);
  });
}

export async function markReunited(id: string, token: string): Promise<ActionResult> {
  return runAction("post.mark_reunited", async () => {
    const row = await authorize(id, token);
    if (!row) return fail("El enlace de gestión no es válido.");

    await getDb()
      .update(posts)
      .set({
        status: "reunited",
        expiresAt: new Date(Date.now() + REUNITED_GRACE_DAYS * DAY_MS),
      })
      .where(eq(posts.id, id));

    log.info("post.reunited", { postId: id, custody: row.custody });
    invalidate(id);
    return ok(undefined);
  });
}

export async function deletePost(id: string, token: string): Promise<ActionResult> {
  return runAction("post.delete", async () => {
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

    log.info("post.deleted", { postId: id, sightingPhotos: sightingPhotos.length });
    invalidate(id);
    return ok(undefined);
  });
}

/* ------------------------------------------------------------ denunciar */

const reportSchema = z.object({
  postId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

export async function reportPost(input: unknown): Promise<ActionResult> {
  return runAction("report.create", async () => {
    const blocked = await guardAction("report.create", input);
    if (blocked) return blocked;
    const parsed = reportSchema.safeParse(input);
    if (!parsed.success) return failValidation(parsed.error);
    const d = parsed.data;

    const [exists] = await getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, d.postId));
    if (!exists) return fail("Esta publicación ya no existe.");

    await getDb()
      .insert(reports)
      .values({ postId: d.postId, reason: d.reason, details: d.details ?? null });
    log.info("report.created", { postId: d.postId, reason: d.reason });
    return ok(undefined);
  });
}
