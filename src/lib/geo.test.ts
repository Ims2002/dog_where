import { describe, expect, it } from "vitest";

import { distanceKm, roundCoordinates } from "./geo";

describe("roundCoordinates", () => {
  it("redondea a 3 decimales por defecto", () => {
    expect(roundCoordinates(38.7312345, 0.1456789)).toEqual({ lat: 38.731, lng: 0.146 });
  });
});

describe("distanceKm", () => {
  it("calcula ~0 km para el mismo punto", () => {
    expect(distanceKm({ lat: 38.73, lng: 0.14 }, { lat: 38.73, lng: 0.14 })).toBe(0);
  });

  it("calcula una distancia razonable entre Jávea y Benitachell (~6 km)", () => {
    const d = distanceKm({ lat: 38.7896, lng: 0.1664 }, { lat: 38.7354, lng: 0.1427 });
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(7.5);
  });
});
