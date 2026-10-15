import type { Metadata } from "next";

import { PublishForm } from "@/features/posts/components/publish-form";
import { listApprovedShelters } from "@/features/shelters/queries";

export const metadata: Metadata = {
  title: "Publicar un animal encontrado",
};

export default async function PublishPage() {
  const shelters = await listApprovedShelters();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <h1 className="condensed text-5xl leading-none font-extrabold">
          Publicar un animal encontrado
        </h1>
        <div className="bg-paper border-on-signal border-l-8 p-4">
          <p className="font-bold">Antes de publicar</p>
          <p>
            Si lleva chapa, llama al teléfono que aparece. Si no, avisa a la Policía Local (092):
            pueden leer su microchip y localizar a su familia en el momento. Si así no aparece,
            publícalo aquí.
          </p>
        </div>
      </div>
      <PublishForm shelters={shelters} />
    </main>
  );
}
