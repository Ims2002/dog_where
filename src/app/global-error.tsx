"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/logger/client";

/** Último recurso: errores en el propio layout raíz. Debe incluir <html> y <body>. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "global-error", { digest: error.digest });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "4rem 1rem",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <h1>Algo ha fallado</h1>
        <p>No hemos podido cargar DogWhere. Vuelve a intentarlo en un momento.</p>
        {error.digest && <p>Código del error: {error.digest}</p>}
        <button type="button" onClick={reset} style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
