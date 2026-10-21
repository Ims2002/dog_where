"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

import { authErrorMessage } from "../errors";

import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

const MIN_PASSWORD = 8;

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="success">
          Contraseña cambiada. Por seguridad hemos cerrado tus otras sesiones.
        </FormAlert>
        <Link href="/entrar" className="font-semibold underline underline-offset-4">
          Entrar con la contraseña nueva
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Mínimo ${MIN_PASSWORD} caracteres.`);
    if (password !== repeat) return setError("Las contraseñas no coinciden.");
    startTransition(async () => {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) setError(authErrorMessage(error));
      else setDone(true);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Contraseña nueva" hint={`Mínimo ${MIN_PASSWORD} caracteres.`}>
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <Field label="Repite la contraseña">
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
