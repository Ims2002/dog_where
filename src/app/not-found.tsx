import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="condensed text-5xl leading-none font-extrabold">No lo encontramos</h1>
      <p className="text-lg">Esta página no existe o la publicación ya se ha archivado.</p>
      <ButtonLink href="/">Ver los animales encontrados</ButtonLink>
    </main>
  );
}
