import { describe, expect, it } from "vitest";

import { parsePostFilters } from "./filters";

describe("parsePostFilters", () => {
  it("ignora valores no válidos en lugar de fallar", () => {
    expect(parsePostFilters({ especie: "dragon", estado: "x", radio: "999" })).toEqual({
      species: undefined,
      custody: undefined,
      radiusKm: 10,
      near: undefined,
    });
  });

  it("lee filtros y ubicación redondeada", () => {
    expect(
      parsePostFilters({
        especie: "cat",
        estado: "not_caught",
        lat: "38.79123",
        lng: "0.16611",
        radio: "25",
      }),
    ).toEqual({
      species: "cat",
      custody: "not_caught",
      radiusKm: 25,
      near: { lat: 38.791, lng: 0.166, radiusKm: 25 },
    });
  });
});
