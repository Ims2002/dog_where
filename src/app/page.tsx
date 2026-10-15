import Form from "next/form";
import { connection } from "next/server";
import { Suspense } from "react";

import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import {
  CUSTODY_LABEL,
  CUSTODY_STATUSES,
  SPECIES,
  SPECIES_LABEL,
} from "@/features/posts/constants";
import { NearMeButton } from "@/features/posts/components/near-me-button";
import { PostCard } from "@/features/posts/components/post-card";
import { parsePostFilters, RADIUS_OPTIONS } from "@/features/posts/filters";
import { listActivePosts } from "@/features/posts/queries";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <section className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="condensed text-5xl leading-[0.95] font-extrabold sm:text-6xl">
            ¿Has perdido a tu perro o a tu gato?
          </h1>
          <p className="text-lg">
            Aquí publican los vecinos de la Marina Alta los animales que encuentran: con su foto,
            dónde lo vieron y dónde está ahora.
          </p>
        </div>
        <div className="bg-paper border-on-signal flex flex-col gap-3 border-2 p-5 md:max-w-xs">
          <p className="condensed text-2xl leading-tight font-extrabold">¿Has encontrado uno?</p>
          <p className="text-sm">
            Mira si lleva chapa y llama a la Policía Local (092) para que lean su microchip. Si así
            no aparece su familia, publícalo.
          </p>
          <ButtonLink href="/publicar" size="lg">
            Publicar un animal
          </ButtonLink>
        </div>
      </section>

      <Suspense fallback={<FiltersSkeleton />}>
        <Filters searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<p className="text-ink-muted">Cargando publicaciones…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Filters({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const raw = await searchParams;
  const f = parsePostFilters(raw);
  const near = f.near;

  return (
    <Form
      action="/"
      scroll={false}
      className="bg-paper border-line flex flex-wrap items-end gap-3 rounded-md border-2 p-4"
      aria-label="Filtrar publicaciones"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Animal
        <Select name="especie" defaultValue={f.species ?? ""} className="py-2">
          <option value="">Todos</option>
          {SPECIES.map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABEL[s]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Dónde está
        <Select name="estado" defaultValue={f.custody ?? ""} className="py-2">
          <option value="">Cualquier sitio</option>
          {CUSTODY_STATUSES.map((c) => (
            <option key={c} value={c}>
              {CUSTODY_LABEL[c]}
            </option>
          ))}
        </Select>
      </label>
      {near && (
        <>
          <input type="hidden" name="lat" value={near.lat} />
          <input type="hidden" name="lng" value={near.lng} />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Radio
            <Select name="radio" defaultValue={String(f.radiusKm)} className="py-2">
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </Select>
          </label>
        </>
      )}
      <button type="submit" className={buttonClasses({ variant: "ink", size: "sm" })}>
        Filtrar
      </button>
      <div className="sm:ml-auto">
        <NearMeButton />
      </div>
    </Form>
  );
}

function FiltersSkeleton() {
  return <div className="bg-paper border-line h-[86px] rounded-md border-2" aria-hidden />;
}

async function Results({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parsePostFilters(await searchParams);
  const items = await listActivePosts({
    species: filters.species,
    custody: filters.custody,
    near: filters.near,
  });
  // "hace 3 horas" depende de la hora actual: se calcula siempre en el momento de la petición.
  await connection();
  const now = new Date();

  if (items.length === 0) {
    const filtered = filters.species || filters.custody || filters.near;
    return (
      <div className="bg-paper border-line flex flex-col items-start gap-3 rounded-md border-2 p-6">
        <p className="condensed text-2xl font-extrabold">
          {filtered ? "No hay publicaciones con estos filtros" : "Todavía no hay publicaciones"}
        </p>
        <p>
          {filtered
            ? "Prueba a ampliar el radio o a quitar algún filtro."
            : "Si has encontrado un animal, sé el primero en publicarlo."}
        </p>
        <ButtonLink href={filtered ? "/" : "/publicar"} variant="outline" size="sm">
          {filtered ? "Quitar filtros" : "Publicar un animal"}
        </ButtonLink>
      </div>
    );
  }

  return (
    <section aria-label="Publicaciones">
      <p className="text-ink-muted mb-3 text-sm">
        {items.length} {items.length === 1 ? "publicación activa" : "publicaciones activas"}
        {filters.near && ` a menos de ${filters.radiusKm} km`}
      </p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <li key={post.id} className="flex">
            <PostCard post={post} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
