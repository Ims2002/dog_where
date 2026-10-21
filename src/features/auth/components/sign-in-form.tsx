"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

import { authErrorMessage } from "../errors";
import { withNext } from "../redirect";

import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: next,
      });
      if (error) {
        setError(authErrorMessage(error));
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email">
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
      <Field
        label="Contraseña"
        hint={
          <Link href="/recuperar" className="font-semibold underline underline-offset-4">
            ¿Has olvidado tu contraseña?
          </Link>
        }
      >
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending || !email || !password}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center">
        ¿No tienes cuenta?{" "}
        <Link
          href={withNext("/registro", next)}
          className="font-semibold underline underline-offset-4"
        >
          Crea una
        </Link>
      </p>
    </form>
  );
}
