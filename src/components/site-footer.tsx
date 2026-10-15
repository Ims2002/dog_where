import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      <div className="text-ink-muted mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:justify-between">
        <p className="max-w-md">
          Si encuentras un animal, avisa también a la Policía Local (092): pueden leer su microchip
          y localizar a su familia.
        </p>
        <nav className="flex gap-4" aria-label="Legal">
          <Link href="/privacidad" className="underline-offset-4 hover:underline">
            Privacidad
          </Link>
          <Link href="/aviso-legal" className="underline-offset-4 hover:underline">
            Aviso legal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
