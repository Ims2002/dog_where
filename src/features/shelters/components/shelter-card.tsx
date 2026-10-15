import { formatKm } from "@/lib/format";

import { SHELTER_KIND_LABEL } from "../constants";
import type { PublicShelter } from "../mappers";

function DropOffStatus({ shelter }: { shelter: PublicShelter }) {
  const text =
    shelter.acceptsDropOff === true
      ? "Acepta animales encontrados"
      : shelter.acceptsDropOff === false
        ? "No recoge animales encontrados"
        : "Llama antes de llevar un animal";
  return (
    <p className="text-sm">
      <span className="font-bold">{text}.</span>
      {shelter.dropOffNotes && <span className="text-ink-muted"> {shelter.dropOffNotes}</span>}
    </p>
  );
}

type Props = {
  shelter: PublicShelter;
  distanceKm?: number | null;
  /** Versión compacta (para elegirla dentro de un formulario). */
  compact?: boolean;
  headingLevel?: "h2" | "h3";
};

export function ShelterCard({ shelter, distanceKm, compact, headingLevel = "h2" }: Props) {
  const Heading = headingLevel;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${shelter.location.lat},${shelter.location.lng}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Heading className="condensed text-xl leading-tight font-extrabold">{shelter.name}</Heading>
        {distanceKm != null && (
          <span className="text-ink-muted text-sm whitespace-nowrap">a {formatKm(distanceKm)}</span>
        )}
      </div>
      <p className="text-ink-muted text-sm">
        {SHELTER_KIND_LABEL[shelter.kind]} en {shelter.locality}
      </p>
      <p>{shelter.address}</p>
      {shelter.openingHours && <p className="text-sm">{shelter.openingHours}</p>}
      <DropOffStatus shelter={shelter} />
      {!compact && (
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
          {shelter.phone && (
            <li>
              <a href={`tel:${shelter.phone}`} className="underline underline-offset-4">
                Llamar al {shelter.phone.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
              </a>
            </li>
          )}
          {shelter.email && (
            <li>
              <a href={`mailto:${shelter.email}`} className="underline underline-offset-4">
                {shelter.email}
              </a>
            </li>
          )}
          {shelter.website && (
            <li>
              <a
                href={shelter.website}
                className="underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Web
              </a>
            </li>
          )}
          <li>
            <a
              href={directions}
              className="underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
