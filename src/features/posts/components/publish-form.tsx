"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";

import { LocationPicker } from "@/components/map/location-picker";
import type { LatLng } from "@/components/map/types";
import { PhotoInput, type UploadedPhoto } from "@/components/photo-input";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useHoneypot } from "@/components/ui/honeypot";
import { NowDateTimeInput, readDateTime } from "@/components/ui/now-datetime-input";
import type { PublicShelter } from "@/features/shelters/mappers";
import { toFieldErrors } from "@/lib/action-result";
import { authClient } from "@/lib/auth/client";

import { createPost } from "../actions";
import { SPECIES, SPECIES_LABEL, type Species } from "../constants";
import { LOCALITIES } from "../localities";
import { validateCreatePost } from "../validation";

import { CustodyFields, custodyInput, EMPTY_CUSTODY, type CustodyValue } from "./custody-fields";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`paso-${n}`}>
      <h2 id={`paso-${n}`} className="flex items-baseline gap-3">
        <span
          className="bg-on-signal text-signal condensed inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-extrabold"
          aria-hidden
        >
          {n}
        </span>
        <span className="condensed text-3xl font-extrabold">{title}</span>
      </h2>
      {children}
    </section>
  );
}

type Created = { id: string; manageToken: string };

export function PublishForm({ shelters }: { shelters: PublicShelter[] }) {
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [species, setSpecies] = useState<Species>("dog");
  const [description, setDescription] = useState("");
  const [hasTag, setHasTag] = useState(false);
  const [tagText, setTagText] = useState("");
  const [tagPhone, setTagPhone] = useState("");
  const [foundLocation, setFoundLocation] = useState<LatLng | null>(null);
  const [locality, setLocality] = useState("");
  const seenAtRef = useRef<HTMLInputElement>(null);
  const [custody, setCustody] = useState<CustodyValue>(EMPTY_CUSTODY);
  // null = sin tocar: con sesión iniciada se muestra el nombre de la cuenta.
  const [finderNameInput, setFinderName] = useState<string | null>(null);
  const [finderContact, setFinderContact] = useState("");
  const { data: session } = authClient.useSession();
  const finderName = finderNameInput ?? session?.user.name ?? "";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, startTransition] = useTransition();
  const honeypot = useHoneypot();

  if (created) return <Published created={created} withAccount={!!session} />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      species,
      description,
      photoUrl: photo?.url ?? "",
      photoPathname: photo?.pathname ?? "",
      hasTag,
      tagText: hasTag && tagText ? tagText : undefined,
      tagPhone: hasTag && tagPhone ? tagPhone : undefined,
      foundLocation: foundLocation ?? undefined,
      locality,
      seenAt: readDateTime(seenAtRef),
      finderName,
      finderContact,
      ...custodyInput(custody),
    };

    const check = validateCreatePost(input);
    if (!check.success) {
      setErrors(toFieldErrors(check.error));
      setFormError("Faltan datos o hay alguno incorrecto. Revisa los campos marcados.");
      return;
    }
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await createPost({ ...check.data, ...honeypot.value() });
      if (result.ok) {
        setCreated(result.data);
        window.scrollTo({ top: 0 });
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-10">
      {honeypot.field}
      {session === null && (
        <p className="text-ink-muted -mt-4 text-sm">
          Puedes publicar sin cuenta. Si{" "}
          <Link
            href="/entrar?next=%2Fpublicar"
            className="font-semibold underline underline-offset-4"
          >
            entras
          </Link>{" "}
          antes, tendrás tus publicaciones a mano en «Mi cuenta».
        </p>
      )}
      <Step n={1} title="La foto">
        <PhotoInput
          folder="posts"
          label="Foto del animal"
          value={photo}
          onChange={setPhoto}
          error={errors.photoUrl ? "Añade una foto del animal." : undefined}
        />
      </Step>

      <Step n={2} title="El animal">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 font-semibold">¿Qué animal es?</legend>
          <div className="flex flex-wrap gap-2">
            {SPECIES.map((s) => (
              <label
                key={s}
                className={cn(
                  "bg-paper has-[:focus-visible]:outline-shelter flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-2 px-4 font-semibold has-[:focus-visible]:outline-3",
                  species === s ? "border-on-signal bg-signal/25" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name="species"
                  value={s}
                  checked={species === s}
                  onChange={() => setSpecies(s)}
                  className="sr-only"
                />
                {SPECIES_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Descripción"
          optional
          hint="Tamaño, color, collar, cómo se comporta…"
          error={errors.description}
        >
          {(a) => (
            <Textarea
              {...a}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <label className="flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            checked={hasTag}
            onChange={(e) => setHasTag(e.target.checked)}
            className="h-5 w-5 accent-[var(--on-signal)]"
          />
          Lleva chapa
        </label>
        {hasTag && (
          <div className="border-line flex flex-col gap-4 border-l-4 pl-4">
            <Field label="¿Qué pone en la chapa?" optional hint="Por ejemplo, su nombre.">
              {(a) => (
                <Input
                  {...a}
                  value={tagText}
                  maxLength={200}
                  onChange={(e) => setTagText(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Teléfono de la chapa"
              optional
              hint="Si no has podido contactar. Solo mostraremos los 3 últimos dígitos."
              error={errors.tagPhone}
            >
              {(a) => (
                <Input
                  {...a}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={tagPhone}
                  onChange={(e) => setTagPhone(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </Step>

      <Step n={3} title="Dónde y cuándo">
        <LocationPicker
          label="Dónde lo encontraste o lo viste"
          value={foundLocation}
          onChange={setFoundLocation}
          hint="En público se mostrará con unos 100 m de margen."
          error={
            errors.foundLocation || errors["foundLocation.lat"]
              ? "Marca en el mapa dónde lo encontraste."
              : undefined
          }
        />
        <Field label="Localidad" error={errors.locality ? "Escribe la localidad." : undefined}>
          {(a) => (
            <>
              <Input
                {...a}
                list="localidades"
                value={locality}
                maxLength={120}
                autoComplete="address-level2"
                onChange={(e) => setLocality(e.target.value)}
              />
              <datalist id="localidades">
                {LOCALITIES.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Cuándo" error={errors.seenAt}>
          {(a) => <NowDateTimeInput {...a} inputRef={seenAtRef} />}
        </Field>
      </Step>

      <Step n={4} title="¿Dónde está ahora?">
        <CustodyFields
          value={custody}
          onChange={setCustody}
          shelters={shelters}
          origin={foundLocation}
          errors={errors}
        />
      </Step>

      <Step n={5} title="Tus datos de contacto">
        <p className="text-ink-muted -mt-2">
          Se mostrarán en la publicación para que la familia pueda contactarte.
        </p>
        <Field label="Tu nombre" error={errors.finderName ? "Escribe tu nombre." : undefined}>
          {(a) => (
            <Input
              {...a}
              value={finderName}
              maxLength={80}
              autoComplete="given-name"
              onChange={(e) => setFinderName(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Teléfono o email"
          hint="Como prefieras que te contacten."
          error={errors.finderContact ? "Indica un teléfono o un email." : undefined}
        >
          {(a) => (
            <Input
              {...a}
              value={finderContact}
              maxLength={120}
              onChange={(e) => setFinderContact(e.target.value)}
            />
          )}
        </Field>
      </Step>

      <div className="flex flex-col gap-3">
        {formError && (
          <p className="text-danger font-semibold" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="self-start">
          {pending ? "Publicando…" : "Publicar"}
        </Button>
        <p className="text-ink-muted text-sm">
          Al publicar aceptas la{" "}
          <Link href="/privacidad" className="underline underline-offset-4">
            política de privacidad
          </Link>
          . La publicación se archiva sola a los 60 días.
        </p>
      </div>
    </form>
  );
}

function Published({ created, withAccount }: { created: Created; withAccount: boolean }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const postUrl = `${origin}/mascota/${created.id}`;
  const manageUrl = `${origin}/gestionar/${created.id}/${created.manageToken}`;

  async function copy() {
    await navigator.clipboard.writeText(manageUrl);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-6" role="status">
      <h2 className="condensed text-5xl leading-none font-extrabold">Publicado</h2>
      <p className="text-lg">Gracias. Ya pueden verlo los vecinos de la zona.</p>

      <div className="bg-paper border-on-signal flex flex-col gap-3 border-2 p-5">
        <p className="font-bold">Guarda tu enlace de gestión</p>
        <p className="text-sm">
          Con él podrás cambiar dónde está el animal, marcarlo como reunido con su familia o borrar
          la publicación.{" "}
          {withAccount ? (
            <>
              También puedes hacerlo desde{" "}
              <Link href="/cuenta" className="font-semibold underline underline-offset-4">
                Mi cuenta
              </Link>
              .
            </>
          ) : (
            "Es la única forma de hacerlo, así que guárdalo y no lo compartas."
          )}
        </p>
        <code className="bg-street block overflow-x-auto rounded p-3 text-sm break-all">
          {manageUrl}
        </code>
        <Button variant="ink" onClick={copy} className="self-start">
          {copied ? "Enlace copiado" : "Copiar enlace de gestión"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/mascota/${created.id}`} size="lg">
          Ver la publicación
        </ButtonLink>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`¿Alguien lo conoce? ${postUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-ink text-ink inline-flex min-h-11 items-center rounded-md border-2 px-4 font-bold"
        >
          Compartir en WhatsApp
        </a>
      </div>
    </div>
  );
}
