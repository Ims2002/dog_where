import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFallback, AuthShell } from "@/features/auth/components/auth-shell";
import { FormAlert } from "@/features/auth/components/form-alert";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({ searchParams }: PageProps<"/restablecer">) {
  return (
    <AuthShell title="Nueva contraseña">
      <Suspense fallback={<AuthFallback />}>
        {searchParams.then((sp) => {
          const token = typeof sp.token === "string" ? sp.token : null;
          if (!token || sp.error) {
            return (
              <>
                <FormAlert>El enlace no es válido o ha caducado.</FormAlert>
                <Link href="/recuperar" className="font-semibold underline underline-offset-4">
                  Pedir un enlace nuevo
                </Link>
              </>
            );
          }
          return <ResetPasswordForm token={token} />;
        })}
      </Suspense>
    </AuthShell>
  );
}
