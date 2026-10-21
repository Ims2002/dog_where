"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/logger/client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "error-boundary", { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="condensed text-5xl leading-none font-extrabold">Algo ha fallado</h1>
      <p className="text-lg">
        No hemos podido cargar esta página. Vuelve a intentarlo en un momento.
      </p>
      {error.digest && (
        <p className="text-ink-muted text-sm">
          Código del error: <code>{error.digest}</code>
        </p>
      )}
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
