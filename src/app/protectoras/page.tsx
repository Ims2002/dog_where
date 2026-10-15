import type { Metadata } from "next";

import { MapView } from "@/components/map/map-view";
import { ShelterCard } from "@/features/shelters/components/shelter-card";
import { listApprovedShelters } from "@/features/shelters/queries";

export const metadata: Metadata = {
  title: "Protectoras y perreras",
  description: "Protectoras de la zona donde puedes llevar un animal que has encontrado.",
};

export default async function SheltersPage() {
  const shelters = await listApprovedShelters();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="condensed text-4xl leading-none font-extrabold sm:text-5xl">
          Protectoras de la zona
        </h1>
        <p className="text-lg">
          Si has encontrado un animal y no puedes quedártelo, estas protectoras pueden ayudarte.
          Llama antes de ir: muchas piden que primero avises a la Policía Local para que lean el
          microchip.
        </p>
      </div>

      {shelters.length === 0 ? (
        <p className="bg-paper border-line rounded-md border-2 p-6">
          Todavía no hay protectoras dadas de alta.
        </p>
      ) : (
        <>
          <MapView
            className="h-80"
            ariaLabel="Mapa de protectoras"
            fit
            points={shelters.map((s) => ({
              id: s.id,
              tone: "shelter",
              lat: s.location.lat,
              lng: s.location.lng,
              label: s.name,
              popup: s.address,
            }))}
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {shelters.map((s) => (
              <li key={s.id} className="bg-paper border-line rounded-md border-2 p-5">
                <ShelterCard shelter={s} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
