import { z } from "zod";

import { blobUrlSchema, coordsSchema, pastDateSchema } from "@/lib/validation";

/** Añadir un punto al reguero de avistamientos de un animal sin capturar. */
export const createSightingSchema = z
  .object({
    postId: z.uuid(),
    location: coordsSchema,
    seenAt: pastDateSchema,
    note: z.string().trim().max(500).optional(),
    photoUrl: blobUrlSchema.optional(),
    photoPathname: z.string().min(1).optional(),
    reporterName: z.string().trim().max(80).optional(),
  })
  .refine((d) => !d.photoUrl === !d.photoPathname, {
    message: "Foto incompleta",
    path: ["photoUrl"],
  });

export type CreateSightingInput = z.input<typeof createSightingSchema>;
export type CreateSightingData = z.output<typeof createSightingSchema>;
