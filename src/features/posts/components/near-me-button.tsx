"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Añade (o quita) ?lat&lng a la URL para ordenar por cercanía. */
export function NearMeButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = params.has("lat") && params.has("lng");

  function navigate(next: URLSearchParams) {
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(params);
        next.set("lat", pos.coords.latitude.toFixed(3));
        next.set("lng", pos.coords.longitude.toFixed(3));
        navigate(next);
      },
      () => setError("No hemos podido obtener tu ubicación."),
      { timeout: 10_000 },
    );
  }

  function clear() {
    const next = new URLSearchParams(params);
    next.delete("lat");
    next.delete("lng");
    navigate(next);
  }

  return (
    <div className="flex flex-col gap-1">
      {active ? (
        <Button variant="outline" size="sm" onClick={clear} disabled={pending}>
          Quitar mi ubicación
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={locate} disabled={pending}>
          {pending ? "Buscando…" : "Cerca de mí"}
        </Button>
      )}
      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
