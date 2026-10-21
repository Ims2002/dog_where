import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Todas las rutas de Better Auth: /api/auth/sign-in/email, /api/auth/callback/google…
export function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
