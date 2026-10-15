import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

/*
 * BORRADOR. Antes del lanzamiento hay que completar el responsable del tratamiento
 * (nombre, NIF y email de contacto) y revisarlo con alguien que conozca el RGPD.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 leading-relaxed">
      <h1 className="condensed text-5xl leading-none font-extrabold">Privacidad</h1>
      <p className="bg-signal/30 border-on-signal border-l-8 p-3 text-sm font-semibold">
        Borrador pendiente de revisión antes del lanzamiento.
      </p>

      <h2 className="condensed mt-4 text-2xl font-extrabold">Qué datos guardamos y para qué</h2>
      <p>
        DogWhere sirve para que un animal encontrado vuelva con su familia. Solo guardamos lo
        necesario para eso:
      </p>
      <ul className="list-disc pl-6">
        <li>
          La foto del animal. Antes de subirla, tu navegador la reduce y le quita los metadatos,
          incluida la ubicación GPS.
        </li>
        <li>Dónde y cuándo lo encontraste. En público se muestra con unos 100 m de margen.</li>
        <li>
          Si te lo quedas en casa y decides indicarlo, la ubicación de tu casa. En público solo se
          muestra la zona (alrededor de 1 km), nunca la dirección.
        </li>
        <li>
          Los datos de la chapa. El teléfono que aparezca se muestra solo con los 3 últimos dígitos
          para que su dueño pueda reconocerlo.
        </li>
        <li>Tu nombre y la forma de contacto que elijas, que se muestran en la publicación.</li>
        <li>
          Los avistamientos que añadan otras personas: punto, hora y, si quieren, una nota, una foto
          y su nombre.
        </li>
      </ul>

      <h2 className="condensed mt-4 text-2xl font-extrabold">Cuánto tiempo</h2>
      <p>
        Las publicaciones se archivan solas a los 60 días (o 7 días después de marcarse como
        reunidas). Al archivarlas borramos la foto, los avistamientos, los datos de la chapa y la
        ubicación de la casa. Puedes borrar tu publicación cuando quieras con tu enlace de gestión.
      </p>

      <h2 className="condensed mt-4 text-2xl font-extrabold">Cookies y analítica</h2>
      <p>
        No usamos cookies de publicidad ni de seguimiento. Medimos visitas de forma agregada con
        Vercel Web Analytics, que no usa cookies.
      </p>

      <h2 className="condensed mt-4 text-2xl font-extrabold">Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación o supresión de tus datos, y reclamar ante la Agencia
        Española de Protección de Datos (aepd.es).
      </p>
    </main>
  );
}
