"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

import { authErrorMessage } from "../errors";
import { withNext } from "../redirect";

import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

const MIN_PASSWORD = 8;

export function SignUpForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sentTo) return <CheckYourEmail email={sentTo} next={next} />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fieldErrors: Record<string, string> = {};
    if (name.trim().length < 2) fieldErrors.name = "Escribe tu nombre";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) fieldErrors.email = "Escribe un email válido";
    if (password.length < MIN_PASSWORD) fieldErrors.password = `Mínimo ${MIN_PASSWORD} caracteres`;
    if (!accepted) fieldErrors.accepted = "Necesitamos que lo aceptes para crear la cuenta";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: next,
      });
      if (error) {
        setError(authErrorMessage(error));
        return;
      }
      // Con verificación obligatoria no hay sesión hasta confirmar el email. Si el email ya
      // existía, Better Auth responde igual (y avisa al dueño por email): no se revela nada.
      setSentTo(email.trim());
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Tu nombre"
        hint="Lo verán quienes te contacten por una publicación."
        error={errors.name}
      >
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <Field label="Email" error={errors.email}>
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
      <Field label="Contraseña" hint={`Mínimo ${MIN_PASSWORD} caracteres.`} error={errors.password}>
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="accent-on-signal mt-1 h-5 w-5 shrink-0"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            aria-invalid={errors.accepted ? true : undefined}
          />
          <span>
            He leído la{" "}
            <Link href="/privacidad" className="font-semibold underline underline-offset-4">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        {errors.accepted && <p className="text-danger text-sm font-semibold">{errors.accepted}</p>}
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creando la cuenta…" : "Crear cuenta"}
      </Button>
      <p className="text-center">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={withNext("/entrar", next)}
          className="font-semibold underline underline-offset-4"
        >
          Entra
        </Link>
      </p>
    </form>
  );
}

function CheckYourEmail({ email, next }: { email: string; next: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: next });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="condensed text-3xl font-extrabold">Revisa tu correo</h2>
      <p>
        Te hemos enviado un enlace a <strong className="break-all">{email}</strong>. Ábrelo para
        confirmar tu email y entrarás directamente.
      </p>
      <p className="text-ink-muted text-sm">
        Si no te llega en un par de minutos, mira en la carpeta de spam.
      </p>
      {state === "sent" && <FormAlert tone="success">Te lo hemos vuelto a enviar.</FormAlert>}
      {state === "error" && (
        <FormAlert>No hemos podido reenviarlo. Espera unos minutos y vuelve a probar.</FormAlert>
      )}
      <Button variant="outline" onClick={resend} disabled={state === "sending" || state === "sent"}>
        {state === "sending" ? "Enviando…" : "Reenviar el enlace"}
      </Button>
    </div>
  );
}
