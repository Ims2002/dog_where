"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

import { authErrorMessage } from "../errors";

import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <FormAlert tone="success">
        Si hay una cuenta con ese email, te hemos enviado un enlace para elegir una contraseña
        nueva. Caduca en 1 hora.
      </FormAlert>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/restablecer",
      });
      // Misma respuesta exista o no la cuenta (no revelamos qué emails están registrados).
      if (error && error.status === 429) setError(authErrorMessage(error));
      else setSent(true);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email de tu cuenta">
        {(p) => (
          <Input
            {...p}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending || !email}>
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </Button>
    </form>
  );
}
