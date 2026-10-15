import { revalidateTag } from "next/cache";
import { connection } from "next/server";

import { POSTS_TAG } from "@/features/posts/constants";
import { archiveExpiredPosts } from "@/features/posts/expire";
import { env } from "@/lib/env";

/** Vercel Cron (ver vercel.json): archiva publicaciones caducadas una vez al día. */
export async function GET(request: Request) {
  await connection();
  const CRON_SECRET = env.cronSecret();
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await archiveExpiredPosts();
  if (result.archived > 0) revalidateTag(POSTS_TAG, "max");
  return Response.json(result);
}
