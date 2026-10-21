import { z } from "zod";

import { createLogger } from "@/lib/logger";

const log = createLogger("client");

const MAX_BODY_BYTES = 8 * 1024;

const reportSchema = z.object({
  source: z.enum(["window", "unhandledrejection", "error-boundary", "global-error"]),
  name: z.string().max(100),
  message: z.string().max(500),
  stack: z.string().max(2000).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(300),
});

/** POST /api/log/client — errores del navegador (ver src/lib/logger/client.ts). */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const { source, path, digest, ...err } = parsed.data;
  log.warn("client.error", {
    requestId: request.headers.get("x-vercel-id") ?? undefined,
    source,
    path,
    digest,
    // Se pasa como objeto plano: el logger lo limpia igual que un Error.
    clientError: err,
  });
  return new Response(null, { status: 204 });
}
