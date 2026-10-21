"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import type { SocialProvider } from "@/lib/auth/providers";

import { authErrorMessage } from "../errors";

import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

type Status = { tone: "error" | "success"; text: string } | null;

/* ------------------------------------------------------------- nombre */

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();
  const trimmed = name.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length < 2) return setStatus({ tone: "error", text: "Escribe tu nombre." });
    startTransition(async () => {
      const { error } = await authClient.updateUser({ name: trimmed });
      setStatus(
        error
          ? { tone: "error", text: authErrorMessage(error) }
          : { tone: "success", text: "Nombre guardado." },
      );
      if (!error) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label="Nombre">
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus(null);
            }}
          />
        )}
      </Field>
      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <Button
        type="submit"
        variant="outline"
        className="self-start"
        disabled={pending || trimmed === initialName}
      >
        {pending ? "Guardando…" : "Guardar nombre"}
      </Button>
    </form>
  );
}

/* --------------------------------------------------------- contraseña */

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      return setStatus({ tone: "error", text: "La nueva tiene que tener al menos 8 caracteres." });
    }
    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (error) return setStatus({ tone: "error", text: authErrorMessage(error) });
      setCurrent("");
      setNext("");
      setStatus({
        tone: "success",
        text: "Contraseña cambiada. Hemos cerrado tus otras sesiones.",
      });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label="Contraseña actual">
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
      </Field>
      <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
        {(p) => (
          <PasswordInput
            {...p}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        )}
      </Field>
      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <Button
        type="submit"
        variant="outline"
        className="self-start"
        disabled={pending || !current || !next}
      >
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------- vincular proveedor */

const PROVIDER_NAME: Record<SocialProvider, string> = { google: "Google", apple: "Apple" };

export function LinkProviderButton({ provider }: { provider: SocialProvider }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setPending(true);
    setError(null);
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: "/cuenta",
      errorCallbackURL: "/cuenta",
    });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" onClick={link} disabled={pending}>
        {pending ? "Abriendo…" : `Vincular ${PROVIDER_NAME[provider]}`}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

/* ------------------------------------------------------- cerrar sesión */

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}

/* -------------------------------------------------------- borrar cuenta */

export function DeleteAccount({
  hasPassword,
  postCount,
}: {
  hasPassword: boolean;
  postCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>
        Borrar mi cuenta
      </Button>
    );
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.deleteUser(hasPassword ? { password } : {});
      if (error) return setError(authErrorMessage(error));
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="border-danger flex flex-col gap-3 rounded-md border-2 p-4">
      <p className="font-semibold">
        Se borrarán tu cuenta y tus datos
        {postCount > 0 &&
          `, y también ${postCount === 1 ? "tu publicación" : `tus ${postCount} publicaciones`} con sus fotos y avistamientos`}
        . No se puede deshacer.
      </p>
      {hasPassword && (
        <Field label="Escribe tu contraseña para confirmar">
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" onClick={confirm} disabled={pending || (hasPassword && !password)}>
          {pending ? "Borrando…" : "Sí, borrar mi cuenta"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
