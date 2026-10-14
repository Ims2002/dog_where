import { toPublicShelter, type PublicShelter } from "@/features/shelters/mappers";
import type { Post, Shelter } from "@/lib/db/schema";
import { roundCoordinates } from "@/lib/geo";
import { maskPhone } from "@/lib/phone";

import { PUBLIC_DECIMALS } from "./constants";

/** Dónde está el animal ahora, en versión pública. */
export type PublicCustody =
  | { status: "with_finder"; area: { lat: number; lng: number } | null }
  | { status: "at_shelter"; shelter: PublicShelter }
  | { status: "not_caught" };

/**
 * Lo único que puede salir de la BD hacia el cliente.
 * Aplica las reglas de privacidad de docs/GUIDELINES.md § 8.
 */
export type PublicPost = {
  id: string;
  species: Post["species"];
  status: Post["status"];
  description: string;
  photoUrl: string;
  hasTag: boolean;
  tagText: string | null;
  tagPhoneMasked: string | null;
  foundLocation: { lat: number; lng: number };
  locality: string;
  seenAt: string;
  custody: PublicCustody;
  finderName: string;
  finderContact: string;
  createdAt: string;
};

function toPublicCustody(post: Post, shelter: Shelter | null): PublicCustody {
  switch (post.custody) {
    case "with_finder":
      return {
        status: "with_finder",
        area:
          post.custodyLat != null && post.custodyLng != null
            ? roundCoordinates(post.custodyLat, post.custodyLng, PUBLIC_DECIMALS.finderHome)
            : null,
      };
    case "at_shelter":
      if (!shelter || shelter.id !== post.shelterId) {
        throw new Error(`La publicación ${post.id} está en una protectora pero no se ha cargado`);
      }
      return { status: "at_shelter", shelter: toPublicShelter(shelter) };
    case "not_caught":
      return { status: "not_caught" };
  }
}

/** @param shelter la protectora asociada (obligatoria si custody = "at_shelter"). */
export function toPublicPost(post: Post, shelter: Shelter | null = null): PublicPost {
  return {
    id: post.id,
    species: post.species,
    status: post.status,
    description: post.description,
    photoUrl: post.photoUrl,
    hasTag: post.hasTag,
    tagText: post.tagText,
    tagPhoneMasked: post.tagPhone ? maskPhone(post.tagPhone) : null,
    foundLocation: roundCoordinates(post.foundLat, post.foundLng, PUBLIC_DECIMALS.foundAt),
    locality: post.locality,
    seenAt: post.seenAt.toISOString(),
    custody: toPublicCustody(post, shelter),
    finderName: post.finderName,
    finderContact: post.finderContact,
    createdAt: post.createdAt.toISOString(),
  };
}
