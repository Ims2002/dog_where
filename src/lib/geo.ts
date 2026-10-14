/**
 * Redondea coordenadas para no publicar la ubicación exacta.
 * 3 decimales ≈ 110 m de precisión en latitud.
 */
export function roundCoordinates(lat: number, lng: number, decimals = 3) {
  const f = 10 ** decimals;
  return { lat: Math.round(lat * f) / f, lng: Math.round(lng * f) / f };
}

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
