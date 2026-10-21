import { revalidateTag } from "next/cache";
import { connection } from "next/server";

import { POSTS_TAG } from "@/features/posts/constants";
import { archiveExpiredPosts } from "@/features/posts/expire";
import { env } from "@/lib/env";
import { createLogger, withLogContext } from "@/lib/logger";
import { currentRequestId } from "@/lib/logger/action";

const log = createLogger("cron");

/** Vercel Cron (ver vercel.json): archiva publicaciones caducadas una vez al día. */
export async function GET(request: Request) {
  await connection();
  const requestId = await currentRequestId();

  return withLogContext({ requestId, job: "expire" }, async () => {
    const CRON_SECRET = env.cronSecret();
    if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
      log.warn("cron.unauthorized");
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await log.time("cron.expire", () => archiveExpiredPosts());
    if (result.archived > 0) revalidateTag(POSTS_TAG, "max");
    return Response.json(result);
  });
}
