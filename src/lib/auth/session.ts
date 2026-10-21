import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { getAuth } from ".";

/**
 * Sesión del usuario actual (o null). Deduplicada por petición con React `cache`.
 * Lee cookies: úsala solo dentro de un <Suspense> o en código dinámico.
 */
export const getSession = cache(async () => {
  // headers() primero: en el prerender corta aquí, antes de crear la instancia de auth.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}
