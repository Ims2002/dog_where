import { describe, expect, it } from "vitest";

import type { Post, Shelter } from "@/lib/db/schema";

import { toPublicPost } from "./mappers";

const post: Post = {
  id: "8f8f2c3e-1111-4a4a-9b9b-123456789abc",
  species: "dog",
  status: "active",
  description: "Collar rojo",
  photoUrl: "https://abc.public.blob.vercel-storage.com/posts/x.webp",
  photoPathname: "posts/x.webp",
  hasTag: true,
  tagText: "Toby",
  tagPhone: "612345678",
  foundLat: 38.7354321,
  foundLng: 0.1427654,
  locality: "Benitachell",
  seenAt: new Date("2026-10-10T10:00:00Z"),
  custody: "with_finder",
  shelterId: null,
  custodyLat: 38.7412345,
  custodyLng: 0.1598765,
  finderName: "Ana",
  finderContact: "ana@example.com",
  authorId: null,
  manageTokenHash: "hash-secreto",
  expiresAt: new Date("2026-12-09T10:00:00Z"),
  createdAt: new Date("2026-10-10T10:05:00Z"),
  updatedAt: new Date("2026-10-10T10:05:00Z"),
};

const shelter: Shelter = {
  id: "3b2d6f2e-5c1a-4e7b-9d3f-0a1b2c3d4e5f",
  kind: "shelter",
  status: "approved",
  name: "Protectora de ejemplo",
  address: "Calle Falsa 123",
  locality: "Jávea",
  lat: 38.7891234,
  lng: 0.1661234,
  phone: "965000000",
  email: null,
  website: null,
  openingHours: "L-V 10-14h",
  acceptsDropOff: true,
  dropOffNotes: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z"),
};

describe("toPublicPost (reglas de privacidad)", () => {
  const pub = toPublicPost(post);
  const serialized = JSON.stringify(pub);

  it("nunca expone el teléfono completo de la chapa", () => {
    expect(serialized).not.toContain("612345678");
    expect(pub.tagPhoneMasked).toBe("••• ••• 678");
  });

  it("redondea el lugar del hallazgo a ~100 m", () => {
    expect(pub.foundLocation).toEqual({ lat: 38.735, lng: 0.143 });
    expect(serialized).not.toContain("38.7354321");
  });

  it("de la casa de quien lo tiene solo muestra la zona (~1 km)", () => {
    expect(pub.custody).toEqual({ status: "with_finder", area: { lat: 38.74, lng: 0.16 } });
    expect(serialized).not.toContain("38.7412345");
  });

  it("no expone campos internos", () => {
    for (const key of [
      "photoPathname",
      "authorId",
      "tagPhone",
      "custodyLat",
      "shelterId",
      "manageTokenHash",
    ]) {
      expect(pub).not.toHaveProperty(key);
    }
  });
});

describe("toPublicPost con protectora", () => {
  const atShelter: Post = {
    ...post,
    custody: "at_shelter",
    shelterId: shelter.id,
    custodyLat: null,
    custodyLng: null,
  };

  it("muestra la protectora con su ubicación exacta", () => {
    const pub = toPublicPost(atShelter, shelter);
    expect(pub.custody.status).toBe("at_shelter");
    if (pub.custody.status === "at_shelter") {
      expect(pub.custody.shelter.location).toEqual({ lat: 38.7891234, lng: 0.1661234 });
      expect(pub.custody.shelter).not.toHaveProperty("status");
    }
  });

  it("falla si no se pasa la protectora", () => {
    expect(() => toPublicPost(atShelter)).toThrow();
  });
});
