export type LatLng = { lat: number; lng: number };

export type MapPoint = LatLng & {
  id: string;
  /** Estilo del punto (ver .map-* en map.css). */
  tone: "found" | "sighting" | "sighting-stale" | "latest" | "shelter" | "pin";
  label?: string;
  /** Texto del popup al pulsar el punto. */
  popup?: string;
  href?: string;
};

export type MapArea = LatLng & { radiusM: number };

export type MapViewProps = {
  points?: MapPoint[];
  areas?: MapArea[];
  /** Línea que une puntos en orden (reguero). */
  path?: LatLng[];
  center?: LatLng;
  zoom?: number;
  /** Ajustar el encuadre para que se vean todos los puntos. */
  fit?: boolean;
  /** Si se pasa, tocar el mapa selecciona un punto. */
  onPick?: (point: LatLng) => void;
  className?: string;
  ariaLabel: string;
};

/** Centro por defecto: Marina Alta (entre Xàbia y Dénia). */
export const DEFAULT_CENTER: LatLng = { lat: 38.8, lng: 0.1 };
