import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AccountsUnavailable,
  AuthFallback,
  AuthShell,
} from "@/features/auth/components/auth-shell";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { SocialButtons } from "@/features/auth/components/social-buttons";
import { safeNext, withNext } from "@/features/auth/redirect";
import { emailPasswordEnabled, enabledSocialProviders } from "@/lib/auth/providers";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/registro">) {
  return (
    <AuthShell
      title="Crear cuenta"
      intro="Gratis y en un minuto. Publicar sin cuenta sigue siendo posible."
    >
      <Suspense fallback={<AuthFallback />}>
        {searchParams.then((sp) => (
          <SignUpView next={safeNext(sp.next)} />
        ))}
      </Suspense>
    </AuthShell>
  );
}

async function SignUpView({ next }: { next: string }) {
  if (await getSession()) redirect(next);
  const providers = enabledSocialProviders();
  const withEmail = emailPasswordEnabled();
  return (
    <>
      <SocialButtons
        providers={providers}
        withEmailBelow={withEmail}
        next={next}
        errorPath={withNext("/entrar", next)}
      />
      {withEmail && <SignUpForm next={next} />}
      {!withEmail && providers.length === 0 && <AccountsUnavailable />}
    </>
  );
}
