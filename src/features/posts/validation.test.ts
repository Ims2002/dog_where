import { describe, expect, it } from "vitest";

import {
  createPostSchema,
  updateCustodySchema,
  validateCreatePost,
  type CreatePostInput,
} from "./validation";

const SHELTER_ID = "3b2d6f2e-5c1a-4e7b-9d3f-0a1b2c3d4e5f";

const base = {
  species: "dog",
  description: "Perro mediano, collar rojo",
  photoUrl: "https://abc123.public.blob.vercel-storage.com/posts/foto.webp",
  photoPathname: "posts/foto.webp",
  hasTag: true,
  tagText: "Toby",
  tagPhone: "+34 612 345 678",
  foundLocation: { lat: 38.7354, lng: 0.1427 },
  locality: "Benitachell",
  seenAt: new Date(Date.now() - 3600_000).toISOString(),
  finderName: "Ana",
  finderContact: "ana@example.com",
} as const;

const withFinder: CreatePostInput = { ...base, custody: "with_finder" };

describe("createPostSchema", () => {
  it("acepta una publicación válida y normaliza el teléfono", () => {
    const result = createPostSchema.parse(withFinder);
    expect(result.tagPhone).toBe("612345678");
    expect(result.seenAt).toBeInstanceOf(Date);
  });

  it("acepta la ubicación de la casa si lo tiene quien lo encontró", () => {
    const r = createPostSchema.safeParse({
      ...withFinder,
      custodyLocation: { lat: 38.74, lng: 0.15 },
    });
    expect(r.success).toBe(true);
  });

  it("exige protectora si se ha dejado en una", () => {
    expect(createPostSchema.safeParse({ ...base, custody: "at_shelter" }).success).toBe(false);
    expect(
      createPostSchema.safeParse({ ...base, custody: "at_shelter", shelterId: SHELTER_ID }).success,
    ).toBe(true);
  });

  it("acepta animales sin capturar", () => {
    expect(createPostSchema.safeParse({ ...base, custody: "not_caught" }).success).toBe(true);
  });

  it("rechaza fotos que no vienen de Vercel Blob", () => {
    const r = createPostSchema.safeParse({ ...withFinder, photoUrl: "https://evil.com/x.jpg" });
    expect(r.success).toBe(false);
  });

  it("rechaza datos de chapa si hasTag es false", () => {
    const r = createPostSchema.safeParse({ ...withFinder, hasTag: false });
    expect(r.success).toBe(false);
  });

  it("rechaza fechas futuras", () => {
    const r = createPostSchema.safeParse({
      ...withFinder,
      seenAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.success).toBe(false);
  });
});

describe("validateCreatePost", () => {
  it("devuelve todos los errores aunque falte la custodia", () => {
    const r = validateCreatePost({ species: "dog", hasTag: false });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["custody", "photoUrl", "foundLocation", "locality", "finderName"]),
    );
  });
});

describe("updateCustodySchema", () => {
  it("permite pasar de 'sin capturar' a 'en protectora'", () => {
    expect(
      updateCustodySchema.safeParse({ custody: "at_shelter", shelterId: SHELTER_ID }).success,
    ).toBe(true);
  });
});
