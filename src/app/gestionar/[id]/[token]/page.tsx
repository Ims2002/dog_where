import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ManagePanel } from "@/features/posts/components/manage-panel";
import { getPostForManagement } from "@/features/posts/queries";
import { postHeadline } from "@/features/posts/text";
import { listApprovedShelters } from "@/features/shelters/queries";

export const metadata: Metadata = {
  title: "Gestionar publicación",
  robots: { index: false, follow: false },
};

export default function ManagePage({ params }: PageProps<"/gestionar/[id]/[token]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense fallback={<p className="text-ink-muted">Cargando…</p>}>
        {params.then(({ id, token }) => (
          <ManageView id={id} token={token} />
        ))}
      </Suspense>
    </main>
  );
}

async function ManageView({ id, token }: { id: string; token: string }) {
  const [found, shelters] = await Promise.all([
    getPostForManagement(id, token),
    listApprovedShelters(),
  ]);

  if (!found) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="condensed text-4xl font-extrabold">Enlace no válido</h1>
        <p>
          Este enlace de gestión no es correcto o la publicación ya no existe. Comprueba que lo has
          copiado entero.
        </p>
        <Link href="/" className="font-semibold underline underline-offset-4">
          Ir al inicio
        </Link>
      </div>
    );
  }

  const { row, post } = found;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-ink-muted">Gestionar publicación</p>
        <h1 className="condensed text-4xl leading-none font-extrabold">{postHeadline(post)}</h1>
        <Link
          href={`/mascota/${post.id}`}
          className="self-start font-semibold underline underline-offset-4"
        >
          Ver la publicación
        </Link>
      </div>
      <ManagePanel
        token={token}
        post={post}
        foundLocation={{ lat: row.foundLat, lng: row.foundLng }}
        shelters={shelters}
        initialCustody={{
          custody: row.custody,
          shelterId: row.shelterId,
          shareHome: row.custodyLat != null,
          custodyLocation:
            row.custodyLat != null && row.custodyLng != null
              ? { lat: row.custodyLat, lng: row.custodyLng }
              : null,
        }}
      />
    </div>
  );
}
