/**
 * Tipos de punto de referencia donde se puede dejar un animal encontrado.
 * - pound:   perrera / centro municipal de recogida.
 * - shelter: protectora o asociación.
 * - vet:     clínica veterinaria colaboradora (puede leer el microchip).
 */
export const SHELTER_KINDS = ["pound", "shelter", "vet"] as const;
export type ShelterKind = (typeof SHELTER_KINDS)[number];

/** Una protectora solo es visible y seleccionable cuando está aprobada. */
export const SHELTER_STATUSES = ["pending", "approved", "disabled"] as const;
export type ShelterStatus = (typeof SHELTER_STATUSES)[number];

/** Radio por defecto para sugerir protectoras al publicar. */
export const NEARBY_SHELTERS_RADIUS_KM = 25;

export const SHELTER_KIND_LABEL: Record<ShelterKind, string> = {
  pound: "Perrera municipal",
  shelter: "Protectora",
  vet: "Clínica veterinaria",
};
