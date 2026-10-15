"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="condensed text-5xl leading-none font-extrabold">Algo ha fallado</h1>
      <p className="text-lg">
        No hemos podido cargar esta página. Vuelve a intentarlo en un momento.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
