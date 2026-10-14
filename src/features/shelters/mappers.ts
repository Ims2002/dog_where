import type { Shelter } from "@/lib/db/schema";

/** Protectora tal como la ve el público: datos completos (es una entidad, no una persona). */
export type PublicShelter = {
  id: string;
  kind: Shelter["kind"];
  name: string;
  address: string;
  locality: string;
  location: { lat: number; lng: number };
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: string | null;
  acceptsDropOff: boolean;
};

export function toPublicShelter(shelter: Shelter): PublicShelter {
  return {
    id: shelter.id,
    kind: shelter.kind,
    name: shelter.name,
    address: shelter.address,
    locality: shelter.locality,
    location: { lat: shelter.lat, lng: shelter.lng },
    phone: shelter.phone,
    email: shelter.email,
    website: shelter.website,
    openingHours: shelter.openingHours,
    acceptsDropOff: shelter.acceptsDropOff,
  };
}
