import Link from "next/link";

import { CustodyBadge } from "@/components/ui/custody-badge";
import { formatKm, timeAgo } from "@/lib/format";

import type { PostListItem } from "../queries";
import { postHeadline } from "../text";

import { PostPhoto } from "./post-photo";

/** Tarjeta-cartel de una publicación en el listado. */
export function PostCard({ post, now }: { post: PostListItem; now: Date }) {
  const headline = postHeadline(post);
  const loose = post.custody.status === "not_caught";

  return (
    <article className="bg-paper border-on-signal relative flex w-full flex-col border-2">
      <div className="relative aspect-[4/3] overflow-hidden">
        <PostPhoto
          src={post.photoUrl}
          alt={headline}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="bg-signal text-on-signal px-4 py-2">
        <h2 className="condensed text-2xl leading-tight font-extrabold">
          <Link href={`/mascota/${post.id}`} className="after:absolute after:inset-0">
            {headline}
          </Link>
        </h2>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CustodyBadge custody={post.custody.status} />
          {post.hasTag && <span className="text-sm font-semibold">Lleva chapa</span>}
        </div>
        <p className="text-ink-muted text-sm">
          {loose && post.sightingsCount > 0
            ? `Visto por última vez ${timeAgo(post.lastSeenAt, now)} · ${post.sightingsCount} ${post.sightingsCount === 1 ? "avistamiento" : "avistamientos"}`
            : `${loose ? "Visto" : "Encontrado"} ${timeAgo(post.seenAt, now)}`}
          {post.distanceKm != null && ` · a ${formatKm(post.distanceKm)}`}
        </p>
        {post.description && <p className="line-clamp-2 text-sm">{post.description}</p>}
      </div>
    </article>
  );
}
