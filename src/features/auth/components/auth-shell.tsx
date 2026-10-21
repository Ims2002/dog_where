import type { ReactNode } from "react";

/** Marco común de las páginas de acceso: estrecho, centrado y legible en el móvil. */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="condensed text-4xl leading-none font-extrabold sm:text-5xl">{title}</h1>
        {intro && <p className="text-lg">{intro}</p>}
      </div>
      <div className="bg-paper border-ink flex flex-col gap-5 rounded-md border-2 p-5">
        {children}
      </div>
    </main>
  );
}

/** Cuando no hay ningún método de acceso configurado (p. ej. producción sin Resend ni Google). */
export function AccountsUnavailable() {
  return (
    <p>
      Las cuentas estarán disponibles muy pronto. Mientras tanto puedes publicar y avisar de
      avistamientos sin cuenta.
    </p>
  );
}

export function AuthFallback() {
  return <p className="text-ink-muted">Cargando…</p>;
}
