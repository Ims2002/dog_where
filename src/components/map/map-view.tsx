"use client";

import dynamic from "next/dynamic";

import type { MapViewProps } from "./types";

/** Leaflet necesita `window`: se carga solo en el cliente. */
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="bg-line/40 h-full w-full animate-pulse" aria-hidden />,
});

export function MapView({ className = "h-72", ...props }: MapViewProps) {
  return (
    <div
      className={`border-line relative isolate overflow-hidden rounded-md border-2 ${className}`}
    >
      <LeafletMap {...props} className="h-full w-full" />
    </div>
  );
}
