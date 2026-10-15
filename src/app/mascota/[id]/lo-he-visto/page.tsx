import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PostPhoto } from "@/features/posts/components/post-photo";
import { getPostDetail } from "@/features/posts/queries";
import { postHeadline } from "@/features/posts/text";
import { SightingForm } from "@/features/sightings/components/sighting-form";

export const metadata: Metadata = {
  title: "Añadir avistamiento",
  robots: { index: false },
};

export default function SightingPage({ params }: PageProps<"/mascota/[id]/lo-he-visto">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense fallback={<p className="text-ink-muted">Cargando…</p>}>
        {params.then(({ id }) => (
          <SightingView id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function SightingView({ id }: { id: string }) {
  const detail = await getPostDetail(id);
  if (!detail) notFound();
  const { post } = detail;
  const headline = postHeadline(post);
  const canAdd = post.status === "active" && post.custody.status === "not_caught";

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/mascota/${id}`} className="flex items-center gap-4">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
          <PostPhoto src={post.photoUrl} alt="" sizes="80px" />
        </span>
        <span className="condensed text-xl font-extrabold underline-offset-4 hover:underline">
          {headline}
        </span>
      </Link>
      <h1 className="condensed text-5xl leading-none font-extrabold">Lo he visto</h1>
      {canAdd ? (
        <SightingForm postId={id} />
      ) : (
        <p className="bg-paper border-line rounded-md border-2 p-5">
          Este animal ya no está suelto, así que no hace falta añadir avistamientos.{" "}
          <Link href={`/mascota/${id}`} className="font-semibold underline underline-offset-4">
            Ver dónde está
          </Link>
          .
        </p>
      )}
    </div>
  );
}
