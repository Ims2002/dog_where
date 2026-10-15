/**
 * Dónde está el animal ahora mismo.
 * - with_finder: lo tiene en casa quien lo encontró.
 * - at_shelter:  lo ha dejado en una protectora/perrera dada de alta.
 * - not_caught:  no se ha podido atrapar; se va dejando un reguero de avistamientos.
 */
export const CUSTODY_STATUSES = ["with_finder", "at_shelter", "not_caught"] as const;
export const SPECIES = ["dog", "cat", "other"] as const;
export const POST_STATUSES = ["active", "reunited", "archived"] as const;
export const REPORT_REASONS = ["spam", "inappropriate", "wrong_info", "other"] as const;

export type CustodyStatus = (typeof CUSTODY_STATUSES)[number];
export type Species = (typeof SPECIES)[number];
export type PostStatus = (typeof POST_STATUSES)[number];

/** Tags de caché (Cache Components). */
export const POSTS_TAG = "posts";
export const postTag = (id: string) => `post:${id}`;

/** Días que una publicación permanece visible antes de archivarse. */
export const POST_TTL_DAYS = 60;
/** Tras comprimir en el navegador suelen pesar < 500 KB. Debe caber en serverActions.bodySizeLimit. */
export const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Precisión con la que se publican coordenadas (decimales).
 * 3 ≈ 110 m · 2 ≈ 1,1 km · 4 ≈ 11 m
 */
export const PUBLIC_DECIMALS = {
  /** Lugar del hallazgo. */
  foundAt: 3,
  /** Casa de quien lo tiene: solo la zona, nunca el domicilio. */
  finderHome: 2,
  /** Avistamientos en la calle: precisión alta, sirven para atraparlo. */
  sighting: 4,
} as const;

/** Etiquetas de UI (la interfaz está en español; el código en inglés). */
export const SPECIES_LABEL: Record<Species, string> = {
  dog: "Perro",
  cat: "Gato",
  other: "Otro",
};
export const CUSTODY_LABEL: Record<CustodyStatus, string> = {
  with_finder: "En casa de quien lo encontró",
  at_shelter: "En una protectora",
  not_caught: "Suelto, sin capturar",
};
