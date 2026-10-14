import { z } from "zod";

import { coordsSchema, optionalSpanishPhoneSchema } from "@/lib/validation";

import { SHELTER_KINDS } from "./constants";

/** Alta de una protectora/perrera/veterinario (queda en estado "pending" hasta aprobarla). */
export const createShelterSchema = z.object({
  kind: z.enum(SHELTER_KINDS),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(200),
  locality: z.string().trim().min(2).max(120),
  location: coordsSchema,
  phone: optionalSpanishPhoneSchema,
  email: z.email().optional(),
  website: z.url({ protocol: /^https?$/ }).optional(),
  openingHours: z.string().trim().max(300).optional(),
  acceptsDropOff: z.boolean().default(true),
});

export type CreateShelterInput = z.input<typeof createShelterSchema>;
export type CreateShelterData = z.output<typeof createShelterSchema>;
