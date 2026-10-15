"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

import { DEFAULT_CENTER, type MapPoint, type MapViewProps } from "./types";

const RADIUS: Record<MapPoint["tone"], number> = {
  found: 11,
  sighting: 8,
  "sighting-stale": 7,
  latest: 12,
  shelter: 10,
  pin: 12,
};

/** Contenido del popup construido con nodos de texto (nunca HTML del usuario). */
function popupContent(p: MapPoint) {
  const root = document.createElement("div");
  if (p.label) {
    const strong = document.createElement("strong");
    strong.textContent = p.label;
    strong.style.display = "block";
    root.append(strong);
  }
  if (p.popup) root.append(document.createTextNode(p.popup));
  if (p.href) {
    const a = document.createElement("a");
    a.href = p.href;
    a.textContent = "Ver";
    a.style.display = "block";
    root.append(a);
  }
  return root;
}

/**
 * Mapa de Leaflet manejado de forma imperativa.
 * Cada montaje crea su propio <div> y lo destruye al desmontar: así funciona bien con
 * <Activity> de Next (rutas ocultas que se vuelven a mostrar) y con StrictMode.
 */
export default function LeafletMap({
  points = [],
  areas = [],
  path,
  center,
  zoom = 12,
  fit,
  onPick,
  className,
  ariaLabel,
}: MapViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Crear / destruir el mapa
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const el = document.createElement("div");
    el.style.height = "100%";
    el.style.width = "100%";
    wrapper.append(el);

    const start = center ?? points[0] ?? areas[0] ?? DEFAULT_CENTER;
    const map = L.map(el, { center: [start.lat, start.lng], zoom, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) =>
      onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    );
    mapRef.current = map;

    return () => {
      map.off();
      map.stop();
      map.remove();
      el.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // El mapa se crea una vez por montaje; los cambios se aplican en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pintar capas cuando cambian los datos
  const dataKey = JSON.stringify({ points, areas, path });
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    for (const a of areas) {
      L.circle([a.lat, a.lng], { radius: a.radiusM, className: "map-area" }).addTo(layers);
    }
    if (path && path.length > 1) {
      L.polyline(
        path.map((p) => [p.lat, p.lng] as [number, number]),
        { className: "map-path" },
      ).addTo(layers);
    }
    for (const p of points) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: RADIUS[p.tone],
        className: `map-${p.tone}`,
      }).addTo(layers);
      if (p.label || p.popup) marker.bindPopup(popupContent(p));
    }

    if (fit) {
      // Encuadre que incluye los puntos y el círculo completo de cada zona.
      const bounds = L.latLngBounds([]);
      for (const p of points) bounds.extend([p.lat, p.lng]);
      for (const a of areas) bounds.extend(L.latLng(a.lat, a.lng).toBounds(a.radiusM * 2));
      if (points.length === 1 && areas.length === 0) {
        map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 14), {
          animate: false,
        });
      } else if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16, animate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, fit]);

  // En modo selector, centrar en el punto elegido
  const centerKey = center ? `${center.lat},${center.lng}` : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center || !onPickRef.current) return;
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15), { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey]);

  return <div ref={wrapperRef} className={className} role="region" aria-label={ariaLabel} />;
}
