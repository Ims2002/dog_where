import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { CustodyBadge } from "@/components/ui/custody-badge";
import {
  ChangePasswordForm,
  DeleteAccount,
  LinkProviderButton,
  ProfileForm,
  SignOutButton,
} from "@/features/auth/components/account-forms";
import { AuthFallback } from "@/features/auth/components/auth-shell";
import { PostPhoto } from "@/features/posts/components/post-photo";
import type { PublicPost } from "@/features/posts/mappers";
import { listPostsByAuthor } from "@/features/posts/owner";
import { postHeadline } from "@/features/posts/text";
import { getAuth } from "@/lib/auth";
import { enabledSocialProviders, SOCIAL_PROVIDERS } from "@/lib/auth/providers";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <Suspense fallback={<AuthFallback />}>
        <AccountView />
      </Suspense>
    </main>
  );
}

const STATUS_LABEL: Record<PublicPost["status"], string> = {
  active: "Activa",
  reunited: "Reunida 🎉",
  archived: "Archivada",
};

const METHOD_LABEL: Record<string, string> = {
  credential: "Email y contraseña",
  google: "Google",
  apple: "Apple",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="condensed text-3xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function AccountView() {
  const session = await getSession();
  if (!session) redirect("/entrar?next=%2Fcuenta");
  const { user } = session;

  const [posts, accounts] = await Promise.all([
    listPostsByAuthor(user.id),
    getAuth().api.listUserAccounts({ headers: await headers() }),
  ]);
  const linked = new Set(accounts.map((a) => a.providerId));
  const hasPassword = linked.has("credential");
  const linkable = enabledSocialProviders().filter((p) => !linked.has(p));

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-ink-muted">Mi cuenta</p>
        <h1 className="condensed text-4xl leading-none font-extrabold break-words sm:text-5xl">
          Hola, {user.name}
        </h1>
      </div>

      <Section id="publicaciones" title="Mis publicaciones">
        {posts.length === 0 ? (
          <div className="bg-paper border-line flex flex-col items-start gap-3 rounded-md border-2 p-5">
            <p>Todavía no has publicado nada con esta cuenta.</p>
            <ButtonLink href="/publicar">Publicar un animal</ButtonLink>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <li key={p.id} className="bg-paper border-line flex gap-3 rounded-md border-2 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm">
                  <PostPhoto src={p.photoUrl} alt="" sizes="80px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="leading-tight font-bold">{postHeadline(p)}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <CustodyBadge custody={p.custody.status} />
                    <span className="text-ink-muted">
                      {STATUS_LABEL[p.status]} · {formatDateTime(p.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm font-semibold">
                    {p.status !== "archived" && (
                      <Link href={`/mascota/${p.id}`} className="underline underline-offset-4">
                        Ver
                      </Link>
                    )}
                    {p.status !== "archived" && (
                      <Link
                        href={`/cuenta/publicaciones/${p.id}`}
                        className="underline underline-offset-4"
                      >
                        Gestionar
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="datos" title="Tus datos">
        <p>
          Email: <strong className="break-all">{user.email}</strong>
        </p>
        <ProfileForm initialName={user.name} />
      </Section>

      <Section id="acceso" title="Cómo entras">
        <ul className="flex flex-col gap-2">
          {["credential", ...SOCIAL_PROVIDERS]
            .filter((m) => linked.has(m))
            .map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span aria-hidden>✓</span>
                {METHOD_LABEL[m]}
              </li>
            ))}
        </ul>
        {linkable.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {linkable.map((p) => (
              <LinkProviderButton key={p} provider={p} />
            ))}
          </div>
        )}
        {hasPassword && (
          <details className="group">
            <summary className="cursor-pointer font-semibold underline underline-offset-4">
              Cambiar contraseña
            </summary>
            <div className="mt-4">
              <ChangePasswordForm />
            </div>
          </details>
        )}
        <div>
          <SignOutButton />
        </div>
      </Section>

      <Section id="borrar" title="Borrar la cuenta">
        <DeleteAccount hasPassword={hasPassword} postCount={posts.length} />
      </Section>
    </>
  );
}
