import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthFallback } from "@/features/auth/components/auth-shell";
import { ManagePanel } from "@/features/posts/components/manage-panel";
import { getOwnPostForManagement } from "@/features/posts/queries";
import { postHeadline } from "@/features/posts/text";
import { listApprovedShelters } from "@/features/shelters/queries";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Gestionar publicación",
  robots: { index: false, follow: false },
};

export default function OwnPostPage({ params }: PageProps<"/cuenta/publicaciones/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense fallback={<AuthFallback />}>
        {params.then(({ id }) => (
          <OwnPostView id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function OwnPostView({ id }: { id: string }) {
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(`/cuenta/publicaciones/${id}`)}`);

  const [found, shelters] = await Promise.all([
    getOwnPostForManagement(id, session.user.id),
    listApprovedShelters(),
  ]);

  if (!found) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="condensed text-4xl font-extrabold">No disponible</h1>
        <p>Esta publicación no existe, ya está archivada o no es tuya.</p>
        <Link href="/cuenta" className="font-semibold underline underline-offset-4">
          Volver a mi cuenta
        </Link>
      </div>
    );
  }

  const { row, post } = found;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/cuenta" className="text-ink-muted font-semibold underline underline-offset-4">
          ← Mi cuenta
        </Link>
        <h1 className="condensed text-4xl leading-none font-extrabold">{postHeadline(post)}</h1>
        <Link
          href={`/mascota/${post.id}`}
          className="self-start font-semibold underline underline-offset-4"
        >
          Ver la publicación
        </Link>
      </div>
      <ManagePanel
        token=""
        backHref="/cuenta"
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
