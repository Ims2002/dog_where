import { z } from "zod";

import { normalizeSpanishPhone } from "@/lib/phone";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** Punto geográfico. */
export const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coords = z.infer<typeof coordsSchema>;

/** URL de una foto subida a nuestro store de Vercel Blob (y no a otro sitio). */
export const blobUrlSchema = z
  .url({ protocol: /^https$/ })
  .refine((u) => new URL(u).hostname.endsWith(BLOB_HOST_SUFFIX), {
    message: "La foto debe subirse a través de la aplicación",
  });

/** Fecha pasada (con 1 min de margen por desajustes de reloj). */
export const pastDateSchema = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now() + 60_000, { message: "La fecha no puede ser futura" });

/** Teléfono español opcional, normalizado a 9 dígitos. */
export const optionalSpanishPhoneSchema = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return undefined;
    const phone = normalizeSpanishPhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Teléfono no válido" });
      return z.NEVER;
    }
    return phone;
  });
