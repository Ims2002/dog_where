import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AccountsUnavailable,
  AuthFallback,
  AuthShell,
} from "@/features/auth/components/auth-shell";
import { FormAlert } from "@/features/auth/components/form-alert";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SocialButtons } from "@/features/auth/components/social-buttons";
import { callbackErrorMessage } from "@/features/auth/errors";
import { safeNext, withNext } from "@/features/auth/redirect";
import { emailPasswordEnabled, enabledSocialProviders } from "@/lib/auth/providers";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <AuthShell title="Entrar" intro="Con tu cuenta tienes todas tus publicaciones a mano.">
      <Suspense fallback={<AuthFallback />}>
        {searchParams.then((sp) => (
          <SignInView
            next={safeNext(sp.next)}
            error={typeof sp.error === "string" ? sp.error : undefined}
          />
        ))}
      </Suspense>
    </AuthShell>
  );
}

async function SignInView({ next, error }: { next: string; error?: string }) {
  if (await getSession()) redirect(next);
  const providers = enabledSocialProviders();
  const withEmail = emailPasswordEnabled();
  const message = callbackErrorMessage(error);
  return (
    <>
      {message && <FormAlert>{message}</FormAlert>}
      <SocialButtons
        providers={providers}
        withEmailBelow={withEmail}
        next={next}
        errorPath={withNext("/entrar", next)}
      />
      {withEmail && <SignInForm next={next} />}
      {!withEmail && providers.length === 0 && <AccountsUnavailable />}
    </>
  );
}
