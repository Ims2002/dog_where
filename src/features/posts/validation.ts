import { z } from "zod";

import {
  blobUrlSchema,
  coordsSchema,
  optionalSpanishPhoneSchema,
  pastDateSchema,
} from "@/lib/validation";

import { SPECIES } from "./constants";

/* ---------- Custodia: dónde está el animal ahora ---------- */

const withFinder = z.object({
  custody: z.literal("with_finder"),
  /** Ubicación de la casa donde está. Opcional; en público solo se muestra la zona. */
  custodyLocation: coordsSchema.optional(),
});

const atShelter = z.object({
  custody: z.literal("at_shelter"),
  /** Protectora dada de alta (y aprobada) donde se ha dejado. */
  shelterId: z.uuid(),
});

const notCaught = z.object({
  custody: z.literal("not_caught"),
});

/** Cambiar la custodia de una publicación existente (p. ej. al conseguir atraparlo). */
export const updateCustodySchema = z.discriminatedUnion("custody", [
  withFinder,
  atShelter,
  notCaught,
]);

/* ---------- Crear publicación ---------- */

const basePost = z.object({
  species: z.enum(SPECIES),
  description: z.string().trim().max(1000).default(""),
  photoUrl: blobUrlSchema,
  photoPathname: z.string().min(1),
  hasTag: z.boolean(),
  tagText: z.string().trim().max(200).optional(),
  tagPhone: optionalSpanishPhoneSchema,
  /** Dónde se encontró o se vio por primera vez. */
  foundLocation: coordsSchema,
  locality: z.string().trim().min(2).max(120),
  seenAt: pastDateSchema,
  finderName: z.string().trim().min(2).max(80),
  finderContact: z.string().trim().min(5).max(120),
});

/** Esquema de entrada para crear una publicación. Se usa en cliente y servidor. */
export const createPostSchema = z
  .discriminatedUnion("custody", [
    basePost.extend(withFinder.shape),
    basePost.extend(atShelter.shape),
    basePost.extend(notCaught.shape),
  ])
  .refine((d) => d.hasTag || (!d.tagText && !d.tagPhone), {
    message: "Solo se pueden indicar datos de chapa si el animal la lleva",
    path: ["hasTag"],
  });

/**
 * Valida una publicación mostrando TODOS los errores a la vez.
 * Con una unión discriminada, si falta `custody` Zod solo informa de ese campo;
 * aquí se añaden también los errores del resto del formulario.
 */
export function validateCreatePost(input: unknown) {
  const result = createPostSchema.safeParse(input);
  if (result.success) return result;
  const base = basePost.safeParse(input);
  if (!base.success) {
    const seen = new Set(result.error.issues.map((i) => i.path.join(".")));
    for (const issue of base.error.issues) {
      if (!seen.has(issue.path.join("."))) result.error.issues.push(issue);
    }
  }
  return result;
}

export type CreatePostInput = z.input<typeof createPostSchema>;
export type CreatePostData = z.output<typeof createPostSchema>;
export type UpdateCustodyInput = z.input<typeof updateCustodySchema>;
