import type { Metadata } from "next";
import Link from "next/link";

import { connection } from "next/server";
import { Suspense } from "react";

import {
  AccountsUnavailable,
  AuthFallback,
  AuthShell,
} from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { emailPasswordEnabled } from "@/lib/auth/providers";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="¿Olvidaste la contraseña?"
      intro="Te enviamos un enlace para elegir una nueva."
    >
      <Suspense fallback={<AuthFallback />}>
        <ForgotPasswordView />
      </Suspense>
      <Link href="/entrar" className="text-center font-semibold underline underline-offset-4">
        Volver a entrar
      </Link>
    </AuthShell>
  );
}

async function ForgotPasswordView() {
  await connection(); // la configuración se lee en tiempo de ejecución, no en el build
  return emailPasswordEnabled() ? <ForgotPasswordForm /> : <AccountsUnavailable />;
}
