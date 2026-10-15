import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso legal" };

/* BORRADOR: completar titular, NIF y contacto antes del lanzamiento. */
export default function LegalPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 leading-relaxed">
      <h1 className="condensed text-5xl leading-none font-extrabold">Aviso legal</h1>
      <p className="bg-signal/30 border-on-signal border-l-8 p-3 text-sm font-semibold">
        Borrador pendiente de revisión antes del lanzamiento.
      </p>
      <p>
        DogWhere es un servicio gratuito y sin ánimo de lucro para ayudar a reunir animales
        extraviados con sus familias en la Marina Alta.
      </p>
      <p>
        Las publicaciones las hacen los propios usuarios, que son responsables de lo que publican.
        Si ves una publicación falsa o inapropiada, denúnciala desde la propia publicación y la
        revisaremos.
      </p>
      <p>
        DogWhere no sustituye a la Policía Local ni a los servicios municipales de recogida de
        animales. Si encuentras un animal, avísales también.
      </p>
    </main>
  );
}
