import Link from "next/link";
import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

async function currentUserOrNull() {
  // Fuera del try: en el prerender esto "suspende" y no debe confundirse con un error.
  await connection();
  try {
    return await getCurrentUser();
  } catch (error) {
    // Está en todas las páginas: un fallo de auth (BD, configuración) no debe tumbar la web.
    log.error("auth.session_failed", {}, error);
    return null;
  }
}

/** Acceso a la cuenta en la cabecera. Lee la sesión: va dentro de un <Suspense>. */
export async function UserMenu() {
  const user = await currentUserOrNull();
  if (!user) {
    return (
      <Link
        href="/entrar"
        className="rounded px-2 py-2 text-sm font-semibold underline-offset-4 hover:underline"
      >
        Entrar
      </Link>
    );
  }
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link
      href="/cuenta"
      className="border-on-signal bg-paper text-ink inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-extrabold"
      aria-label="Mi cuenta"
      title="Mi cuenta"
    >
      {initial}
    </Link>
  );
}

export function UserMenuFallback() {
  return <span className="inline-block h-10 w-10" aria-hidden />;
}
