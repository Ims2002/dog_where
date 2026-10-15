import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-on-signal bg-signal text-on-signal border-b-4">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="condensed text-2xl font-extrabold tracking-tight">
          DogWhere
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Principal">
          <Link
            href="/protectoras"
            className="rounded px-2 py-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Protectoras
          </Link>
          <ButtonLink href="/publicar" variant="ink" size="sm">
            Publicar
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
