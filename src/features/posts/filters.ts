import { z } from "zod";

import { CUSTODY_STATUSES, SPECIES } from "./constants";
import type { PostFilters } from "./queries";

export const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

/** Filtros del listado leídos de la URL (?especie=dog&estado=not_caught&lat=…&lng=…&radio=10). */
const searchSchema = z.object({
  especie: optionalEnum(SPECIES),
  estado: optionalEnum(CUSTODY_STATUSES),
  lat: z.coerce.number().min(-90).max(90).optional().catch(undefined),
  lng: z.coerce.number().min(-180).max(180).optional().catch(undefined),
  radio: z.coerce.number().int().min(1).max(50).catch(10).default(10),
});

type RawSearch = Record<string, string | string[] | undefined>;

export function parsePostFilters(raw: RawSearch): PostFilters & { radiusKm: number } {
  const first = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const s = searchSchema.parse(first);
  return {
    species: s.especie,
    custody: s.estado,
    radiusKm: s.radio,
    // Se redondea para que la caché no tenga una entrada por cada metro.
    near:
      s.lat != null && s.lng != null
        ? { lat: Number(s.lat.toFixed(3)), lng: Number(s.lng.toFixed(3)), radiusKm: s.radio }
        : undefined,
  };
}
