"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import type { SocialProvider } from "@/lib/auth/providers";

import { authErrorMessage } from "../errors";

import { FormAlert } from "./form-alert";

const LABEL: Record<SocialProvider, string> = {
  google: "Continuar con Google",
  apple: "Continuar con Apple",
};

/** Botones de acceso rápido. Solo aparecen los proveedores configurados. */
export function SocialButtons({
  providers,
  next,
  errorPath,
  withEmailBelow = true,
}: {
  providers: SocialProvider[];
  /** Muestra el separador «o con tu email» (solo si hay formulario debajo). */
  withEmailBelow?: boolean;
  next: string;
  /** Página a la que volver si el proveedor devuelve un error (?error=…). */
  errorPath: string;
}) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function signIn(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: next,
      errorCallbackURL: errorPath,
    });
    // Si va bien, el navegador ya se está yendo al proveedor.
    if (error) {
      setError(authErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <Button
          key={p}
          variant={p === "apple" ? "ink" : "outline"}
          size="lg"
          className="w-full"
          disabled={pending !== null}
          onClick={() => signIn(p)}
        >
          {pending === p ? "Abriendo…" : LABEL[p]}
        </Button>
      ))}
      {error && <FormAlert>{error}</FormAlert>}
      {withEmailBelow && (
        <div className="text-ink-muted flex items-center gap-3 text-sm" aria-hidden>
          <span className="bg-line h-0.5 flex-1" />o con tu email
          <span className="bg-line h-0.5 flex-1" />
        </div>
      )}
    </div>
  );
}
