"use client";

import { LocationPicker } from "@/components/map/location-picker";
import type { LatLng } from "@/components/map/types";
import { cn } from "@/components/ui/cn";
import { ShelterCard } from "@/features/shelters/components/shelter-card";
import type { PublicShelter } from "@/features/shelters/mappers";
import { distanceKm } from "@/lib/geo";

import type { CustodyStatus } from "../constants";

export type CustodyValue = {
  custody: CustodyStatus | null;
  shelterId: string | null;
  shareHome: boolean;
  custodyLocation: LatLng | null;
};

export const EMPTY_CUSTODY: CustodyValue = {
  custody: null,
  shelterId: null,
  shareHome: false,
  custodyLocation: null,
};

/** Convierte el estado del formulario en la parte "custodia" de la entrada de la acción. */
export function custodyInput(v: CustodyValue) {
  switch (v.custody) {
    case "with_finder":
      return {
        custody: "with_finder" as const,
        custodyLocation: v.shareHome && v.custodyLocation ? v.custodyLocation : undefined,
      };
    case "at_shelter":
      return { custody: "at_shelter" as const, shelterId: v.shelterId ?? "" };
    case "not_caught":
      return { custody: "not_caught" as const };
    default:
      return { custody: undefined };
  }
}

const OPTIONS: { value: CustodyStatus; title: string; text: string }[] = [
  {
    value: "with_finder",
    title: "Me lo quedo en casa",
    text: "Lo cuidas hasta que aparezca su familia.",
  },
  {
    value: "at_shelter",
    title: "Lo llevo a una protectora",
    text: "Elige una de las protectoras de la zona.",
  },
  {
    value: "not_caught",
    title: "No he podido atraparlo",
    text: "Los vecinos podrán ir marcando dónde lo ven.",
  },
];

type Props = {
  value: CustodyValue;
  onChange: (v: CustodyValue) => void;
  shelters: PublicShelter[];
  /** Para ordenar las protectoras por cercanía. */
  origin: LatLng | null;
  errors: Record<string, string>;
  /** En gestión, "no he podido atraparlo" puede no tener sentido (ya está atrapado). */
  allowed?: CustodyStatus[];
};

export function CustodyFields({ value, onChange, shelters, origin, errors, allowed }: Props) {
  const options = OPTIONS.filter((o) => !allowed || allowed.includes(o.value));
  const sorted = origin
    ? [...shelters].map((s) => ({ s, d: distanceKm(origin, s.location) })).sort((a, b) => a.d - b.d)
    : shelters.map((s) => ({ s, d: null as number | null }));

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Dónde está el animal ahora</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "bg-paper has-[:focus-visible]:outline-shelter flex cursor-pointer gap-3 rounded-md border-2 p-4 has-[:focus-visible]:outline-3",
              value.custody === o.value ? "border-on-signal bg-signal/25" : "border-line",
            )}
          >
            <input
              type="radio"
              name="custody"
              value={o.value}
              checked={value.custody === o.value}
              onChange={() => onChange({ ...value, custody: o.value })}
              className="mt-1 h-5 w-5 accent-[var(--on-signal)]"
            />
            <span>
              <span className="block font-bold">{o.title}</span>
              <span className="text-ink-muted text-sm">{o.text}</span>
            </span>
          </label>
        ))}
        {errors.custody && (
          <p className="text-danger text-sm font-semibold" role="alert">
            Indica dónde está el animal ahora.
          </p>
        )}
      </fieldset>

      {value.custody === "with_finder" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={value.shareHome}
              onChange={(e) => onChange({ ...value, shareHome: e.target.checked })}
              className="mt-1 h-5 w-5 accent-[var(--on-signal)]"
            />
            <span>
              <span className="block font-semibold">Añadir dónde está mi casa</span>
              <span className="text-ink-muted text-sm">
                Solo se mostrará la zona (radio de 1 km aprox.), nunca tu dirección.
              </span>
            </span>
          </label>
          {value.shareHome && (
            <LocationPicker
              label="Ubicación de tu casa"
              value={value.custodyLocation}
              onChange={(p) => onChange({ ...value, custodyLocation: p })}
              error={errors["custodyLocation"] ?? errors["custodyLocation.lat"]}
            />
          )}
        </div>
      )}

      {value.custody === "at_shelter" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">
            ¿A qué protectora?{" "}
            {origin && (
              <span className="text-ink-muted font-normal">(las más cercanas primero)</span>
            )}
          </legend>
          {sorted.length === 0 && (
            <p className="text-ink-muted">Todavía no hay protectoras dadas de alta.</p>
          )}
          {sorted.map(({ s, d }) => (
            <label
              key={s.id}
              className={cn(
                "bg-paper has-[:focus-visible]:outline-shelter flex cursor-pointer gap-3 rounded-md border-2 p-4 has-[:focus-visible]:outline-3",
                value.shelterId === s.id ? "border-shelter" : "border-line",
              )}
            >
              <input
                type="radio"
                name="shelter"
                value={s.id}
                checked={value.shelterId === s.id}
                onChange={() => onChange({ ...value, shelterId: s.id })}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <ShelterCard shelter={s} distanceKm={d} compact headingLevel="h3" />
            </label>
          ))}
          {errors.shelterId && (
            <p className="text-danger text-sm font-semibold" role="alert">
              Elige una protectora.
            </p>
          )}
        </fieldset>
      )}

      {value.custody === "not_caught" && (
        <p className="bg-paper border-loose rounded-md border-2 p-4">
          El lugar donde lo has visto será el primer punto del reguero. Comparte la publicación: los
          vecinos que lo vean podrán añadir dónde y cuándo.
        </p>
      )}
    </div>
  );
}
