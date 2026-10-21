import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage");

export type StoredPhoto = { url: string; pathname: string };

const DEV_DIR = path.join(process.cwd(), "public", "dev-uploads");
export const DEV_UPLOADS_PREFIX = "/dev-uploads/";

const EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function shouldStoreLocally() {
  return process.env.NODE_ENV !== "production" && !env.blobToken();
}

/**
 * Guarda una foto ya validada. En producción va a Vercel Blob; en desarrollo,
 * si no hay BLOB_READ_WRITE_TOKEN, se guarda en public/dev-uploads.
 */
export async function putPhoto(file: File, folder: "posts" | "sightings"): Promise<StoredPhoto> {
  const name = `${folder}/${randomUUID()}.${EXTENSION[file.type] ?? "bin"}`;

  if (shouldStoreLocally()) {
    const target = path.join(DEV_DIR, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    log.debug("storage.put", { backend: "local", pathname: name, bytes: file.size });
    return { url: `${DEV_UPLOADS_PREFIX}${name}`, pathname: name };
  }

  const blob = await put(name, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });
  log.debug("storage.put", { backend: "blob", pathname: blob.pathname, bytes: file.size });
  return { url: blob.url, pathname: blob.pathname };
}

/** Borra fotos por pathname. Nunca lanza: un blob huérfano no debe romper la operación. */
export async function deletePhotos(pathnames: string[]) {
  const list = pathnames.filter(Boolean);
  if (list.length === 0) return;
  try {
    if (shouldStoreLocally()) {
      await Promise.all(list.map((p) => unlink(path.join(DEV_DIR, p)).catch(() => undefined)));
      return;
    }
    await del(list, { abortSignal: AbortSignal.timeout(15_000) });
    log.info("storage.deleted", { count: list.length });
  } catch (error) {
    // Quedan fotos huérfanas en Blob: no rompe nada, pero conviene saberlo para limpiarlas.
    log.error("storage.delete_failed", { count: list.length, pathnames: list }, error);
  }
}
