"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { MapView } from "./map-view";
import type { LatLng } from "./types";

type Props = {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  label: string;
  /** Explicación de qué precisión tendrá en público. */
  hint?: string;
  error?: string;
};

/** Selector de ubicación: "usar mi ubicación" o tocar el mapa. */
export function LocationPicker({ value, onChange, label, hint, error }: Props) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite obtener la ubicación. Toca el mapa para marcarla.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError("No hemos podido obtener tu ubicación. Toca el mapa para marcarla.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 font-semibold">{label}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          {locating ? "Buscando…" : "Usar mi ubicación"}
        </Button>
        <span className="text-ink-muted text-sm">o toca el mapa para marcar el punto</span>
      </div>
      <MapView
        className="h-64"
        ariaLabel={label}
        center={value ?? undefined}
        zoom={value ? 15 : 11}
        points={value ? [{ id: "pin", tone: "pin", ...value }] : []}
        onPick={onChange}
      />
      {value && (
        <p className="text-ink-muted text-sm">
          Punto marcado: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
      {hint && <p className="text-ink-muted text-sm">{hint}</p>}
      {(error || geoError) && (
        <p className="text-danger text-sm font-semibold" role="alert">
          {error ?? geoError}
        </p>
      )}
    </fieldset>
  );
}
