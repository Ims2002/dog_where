import { describe, expect, it } from "vitest";

import type { Sighting } from "@/lib/db/schema";

import { buildTrail, toPublicSighting } from "./mappers";
import { createSightingSchema } from "./validation";

const POST_ID = "8f8f2c3e-1111-4a4a-9b9b-123456789abc";

describe("createSightingSchema", () => {
  const valid = {
    postId: POST_ID,
    location: { lat: 38.73, lng: 0.14 },
    seenAt: new Date(Date.now() - 600_000).toISOString(),
    note: "Corriendo hacia la playa",
  };

  it("acepta un avistamiento válido", () => {
    expect(createSightingSchema.safeParse(valid).success).toBe(true);
  });

  it("exige url y pathname juntos si hay foto", () => {
    const r = createSightingSchema.safeParse({
      ...valid,
      photoUrl: "https://abc.public.blob.vercel-storage.com/s/1.webp",
    });
    expect(r.success).toBe(false);
  });
});

describe("toPublicSighting", () => {
  it("redondea a ~11 m y oculta el pathname", () => {
    const s: Sighting = {
      id: "a1",
      postId: POST_ID,
      lat: 38.7312345,
      lng: 0.1456789,
      seenAt: new Date("2026-10-12T08:00:00Z"),
      note: null,
      photoUrl: null,
      photoPathname: "s/1.webp",
      reporterName: null,
      createdAt: new Date("2026-10-12T08:01:00Z"),
    };
    const pub = toPublicSighting(s);
    expect(pub.location).toEqual({ lat: 38.7312, lng: 0.1457 });
    expect(pub).not.toHaveProperty("photoPathname");
  });
});

describe("buildTrail", () => {
  it("ordena cronológicamente y marca el origen y los puntos antiguos", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const trail = buildTrail(
      { location: { lat: 1, lng: 1 }, seenAt: "2026-10-11T09:00:00Z" },
      [
        {
          id: "b",
          location: { lat: 3, lng: 3 },
          seenAt: "2026-10-14T10:00:00Z",
          note: null,
          photoUrl: null,
          reporterName: null,
        },
        {
          id: "a",
          location: { lat: 2, lng: 2 },
          seenAt: "2026-10-13T10:00:00Z",
          note: null,
          photoUrl: null,
          reporterName: null,
        },
      ],
      now,
    );
    expect(trail.map((p) => p.location.lat)).toEqual([1, 2, 3]);
    expect(trail[0]).toMatchObject({ isOrigin: true, isStale: true });
    expect(trail[2]).toMatchObject({ isOrigin: false, isStale: false });
  });
});
