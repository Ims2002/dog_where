import { PUBLIC_DECIMALS } from "@/features/posts/constants";
import type { Sighting } from "@/lib/db/schema";
import { roundCoordinates } from "@/lib/geo";

import { SIGHTING_STALE_HOURS } from "./constants";

export type PublicSighting = {
  id: string;
  location: { lat: number; lng: number };
  seenAt: string;
  note: string | null;
  photoUrl: string | null;
  reporterName: string | null;
};

export function toPublicSighting(s: Sighting): PublicSighting {
  return {
    id: s.id,
    location: roundCoordinates(s.lat, s.lng, PUBLIC_DECIMALS.sighting),
    seenAt: s.seenAt.toISOString(),
    note: s.note,
    photoUrl: s.photoUrl,
    reporterName: s.reporterName,
  };
}

export type TrailPoint = {
  location: { lat: number; lng: number };
  seenAt: string;
  isOrigin: boolean;
  isStale: boolean;
};

/**
 * Reguero ordenado cronológicamente: el lugar del hallazgo + todos los avistamientos.
 * El último punto es la mejor pista de dónde está ahora.
 */
export function buildTrail(
  origin: { location: { lat: number; lng: number }; seenAt: string },
  sightings: PublicSighting[],
  now: Date = new Date(),
): TrailPoint[] {
  const staleBefore = now.getTime() - SIGHTING_STALE_HOURS * 3600_000;
  const points = [
    { location: origin.location, seenAt: origin.seenAt, isOrigin: true },
    ...sightings.map((s) => ({ location: s.location, seenAt: s.seenAt, isOrigin: false })),
  ];
  return points
    .sort((a, b) => Date.parse(a.seenAt) - Date.parse(b.seenAt))
    .map((p) => ({ ...p, isStale: Date.parse(p.seenAt) < staleBefore }));
}
