import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MapView } from "@/components/map/map-view";
import type { MapPoint } from "@/components/map/types";
import { ButtonLink } from "@/components/ui/button";
import { CustodyBadge } from "@/components/ui/custody-badge";
import { PostPhoto } from "@/features/posts/components/post-photo";
import { ReportForm } from "@/features/posts/components/report-form";
import { ShareButton } from "@/features/posts/components/share-button";
import type { PublicPost } from "@/features/posts/mappers";
import { getPostDetail } from "@/features/posts/queries";
import { postHeadline } from "@/features/posts/text";
import { ShelterCard } from "@/features/shelters/components/shelter-card";
import { buildTrail, type PublicSighting } from "@/features/sightings/mappers";
import { contactHref, formatDateTime, timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/mascota/[id]">): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPostDetail(id);
  if (!detail) return { title: "Publicación no encontrada" };
  const title = postHeadline(detail.post);
  return {
    title,
    description: detail.post.description || "¿Es tuyo? Mira dónde está y contacta.",
    openGraph: {
      title,
      images: detail.post.photoUrl.startsWith("http") ? [detail.post.photoUrl] : [],
    },
  };
}

export default function PostPage({ params }: PageProps<"/mascota/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<p className="text-ink-muted">Cargando…</p>}>
        {params.then(({ id }) => (
          <PostDetailView id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function PostDetailView({ id }: { id: string }) {
  const detail = await getPostDetail(id);
  if (!detail) notFound();
  const { post, sightings } = detail;
  const headline = postHeadline(post);
  const now = new Date();

  return (
    <article className="flex flex-col gap-8">
      <div className="bg-paper border-on-signal border-2">
        {post.status === "reunited" && (
          <p className="bg-finder dark:text-street px-4 py-2 font-bold text-white">
            Ya está con su familia. ¡Gracias a todos los que ayudasteis!
          </p>
        )}
        <div className="relative aspect-[4/3]">
          <PostPhoto
            src={post.photoUrl}
            alt={headline}
            sizes="(min-width: 768px) 720px, 100vw"
            priority
          />
        </div>
        <div className="bg-signal text-on-signal px-4 py-3">
          <h1 className="condensed text-4xl leading-none font-extrabold sm:text-5xl">{headline}</h1>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CustodyBadge custody={post.custody.status} />
            <span className="text-ink-muted text-sm">
              {post.custody.status === "not_caught" ? "Visto por primera vez" : "Encontrado"} el{" "}
              {formatDateTime(post.seenAt)} ({timeAgo(post.seenAt, now)})
            </span>
          </div>
          {post.description && <p className="text-lg whitespace-pre-line">{post.description}</p>}
          {post.hasTag && <TagInfo post={post} />}
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="donde-esta">
        <h2 id="donde-esta" className="condensed text-3xl font-extrabold">
          Dónde está ahora
        </h2>
        <CustodySection post={post} sightings={sightings} now={now} />
      </section>

      <ContactStrip post={post} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ShareButton title={headline} />
        <ReportForm postId={post.id} />
      </div>
    </article>
  );
}

function TagInfo({ post }: { post: PublicPost }) {
  return (
    <div className="border-line rounded-md border-2 border-dashed p-3">
      <p className="font-bold">Lleva chapa</p>
      {post.tagText && <p>Dice: «{post.tagText}»</p>}
      {post.tagPhoneMasked && (
        <p>
          Teléfono de la chapa:{" "}
          <span className="font-bold tracking-wider">{post.tagPhoneMasked}</span>
          <span className="text-ink-muted block text-sm">
            Por privacidad solo mostramos los últimos dígitos. Si es tu número, es tu animal.
          </span>
        </p>
      )}
    </div>
  );
}

function CustodySection({
  post,
  sightings,
  now,
}: {
  post: PublicPost;
  sightings: PublicSighting[];
  now: Date;
}) {
  const found: MapPoint = {
    id: "found",
    tone: "found",
    ...post.foundLocation,
    label: "Donde se encontró",
    popup: formatDateTime(post.seenAt),
  };
  const c = post.custody;

  if (c.status === "with_finder") {
    return (
      <>
        <p className="text-lg">
          Lo tiene {post.finderName} en su casa
          {c.area ? ", en la zona marcada en el mapa." : "."} Contacta para ir a recogerlo.
        </p>
        <MapView
          ariaLabel="Mapa con el lugar del hallazgo y la zona donde está"
          fit
          points={[found]}
          // 1 km: la zona publicada se redondea a 2 decimales, así la casa siempre queda dentro.
          areas={c.area ? [{ ...c.area, radiusM: 1000 }] : []}
        />
        <p className="text-ink-muted text-sm">
          El punto amarillo es donde se encontró (aproximado). La zona verde es dónde está ahora; la
          dirección exacta te la dará quien lo encontró.
        </p>
      </>
    );
  }

  if (c.status === "at_shelter") {
    return (
      <>
        <div className="bg-paper border-shelter rounded-md border-2 p-5">
          <ShelterCard shelter={c.shelter} headingLevel="h3" />
        </div>
        <MapView
          ariaLabel="Mapa con el lugar del hallazgo y la protectora"
          fit
          points={[
            found,
            {
              id: "shelter",
              tone: "shelter",
              ...c.shelter.location,
              label: c.shelter.name,
              popup: c.shelter.address,
            },
          ]}
        />
      </>
    );
  }

  const trail = buildTrail({ location: post.foundLocation, seenAt: post.seenAt }, sightings, now);
  const last = trail.at(-1);
  const active = post.status === "active";

  return (
    <>
      <p className="text-lg">
        No se ha podido atrapar.{" "}
        {last && !last.isOrigin
          ? `Lo vieron por última vez ${timeAgo(last.seenAt, now)}.`
          : "Si lo ves, marca dónde: cada avistamiento ayuda a acotar la zona."}
      </p>
      {active && (
        <ButtonLink href={`/mascota/${post.id}/lo-he-visto`} size="lg" className="self-start">
          Lo he visto
        </ButtonLink>
      )}
      <MapView
        className="h-80"
        ariaLabel="Mapa con el reguero de avistamientos"
        fit
        path={trail.map((p) => p.location)}
        points={trail.map((p, i) => ({
          id: `t-${i}`,
          ...p.location,
          tone: p.isOrigin
            ? "found"
            : i === trail.length - 1
              ? "latest"
              : p.isStale
                ? "sighting-stale"
                : "sighting",
          label: p.isOrigin ? "Donde se encontró" : `Avistamiento`,
          popup: formatDateTime(p.seenAt),
        }))}
      />
      {sightings.length > 0 && (
        <ol
          className="flex flex-col gap-2"
          aria-label="Avistamientos, del más reciente al más antiguo"
        >
          {[...sightings].reverse().map((s) => (
            <li key={s.id} className="bg-paper border-line flex gap-3 rounded-md border-2 p-3">
              {s.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura pequeña
                <img src={s.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              )}
              <div className="text-sm">
                <p className="font-bold">
                  {formatDateTime(s.seenAt)} · {timeAgo(s.seenAt, now)}
                </p>
                {s.note && <p>{s.note}</p>}
                {s.reporterName && <p className="text-ink-muted">Avisó: {s.reporterName}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function ContactStrip({ post }: { post: PublicPost }) {
  const href = contactHref(post.finderContact);
  return (
    <section
      aria-labelledby="contacto"
      className="bg-paper border-on-signal relative border-2 border-dashed px-5 pt-6 pb-5"
    >
      <div className="perforated absolute inset-x-0 -top-px h-2" aria-hidden />
      <h2 id="contacto" className="condensed text-3xl font-extrabold">
        ¿Es tuyo?
      </h2>
      <p className="mt-1">
        Contacta con {post.finderName}
        {post.custody.status === "at_shelter" ? " o directamente con la protectora" : ""}.
      </p>
      <p className="mt-3">
        {href ? (
          <a
            href={href}
            className="bg-signal text-on-signal border-on-signal inline-flex min-h-11 items-center rounded-md border-2 px-4 text-lg font-bold"
          >
            {post.finderContact}
          </a>
        ) : (
          <span className="text-lg font-bold">{post.finderContact}</span>
        )}
      </p>
    </section>
  );
}
