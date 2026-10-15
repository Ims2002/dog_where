import { describe, expect, it } from "vitest";

import { createShelterSchema } from "./validation";

describe("createShelterSchema", () => {
  const valid = {
    kind: "pound",
    name: "Centro municipal de recogida",
    address: "Camí de la Perrera s/n",
    locality: "Benitachell",
    location: { lat: 38.73, lng: 0.14 },
    phone: "965 00 00 00",
  };

  it("acepta una perrera válida y normaliza el teléfono", () => {
    const r = createShelterSchema.parse(valid);
    expect(r.phone).toBe("965000000");
    expect(r.acceptsDropOff).toBeNull();
    expect(r.status).toBe("pending");
  });

  it("rechaza tipos desconocidos", () => {
    expect(createShelterSchema.safeParse({ ...valid, kind: "zoo" }).success).toBe(false);
  });
});
