"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { LatLng } from "@/components/map/types";
import { Button } from "@/components/ui/button";
import { CustodyBadge } from "@/components/ui/custody-badge";
import type { PublicShelter } from "@/features/shelters/mappers";

import { deletePost, markReunited, updateCustody } from "../actions";
import type { PublicPost } from "../mappers";

import { CustodyFields, custodyInput, type CustodyValue } from "./custody-fields";

type Props = {
  token: string;
  post: PublicPost;
  initialCustody: CustodyValue;
  foundLocation: LatLng;
  shelters: PublicShelter[];
};

export function ManagePanel({ token, post, initialCustody, foundLocation, shelters }: Props) {
  const router = useRouter();
  const [custody, setCustody] = useState(initialCustody);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"reunited" | "delete" | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (deleted) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="condensed text-3xl font-extrabold">Publicación borrada</p>
        <p>Se han borrado la publicación, sus fotos y sus avistamientos.</p>
        <Link href="/" className="font-semibold underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    );
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>,
    done: string,
  ) {
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        setErrors({});
        setMessage(done);
        setConfirm(null);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        setMessage(r.error ?? "Algo ha fallado.");
      }
    });
  }

  const reunited = post.status === "reunited";

  return (
    <div className="flex flex-col gap-10">
      {message && (
        <p className="bg-paper border-on-signal border-l-8 p-4 font-semibold" role="status">
          {message}
        </p>
      )}

      {!reunited && (
        <section className="flex flex-col gap-4" aria-labelledby="custodia">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="custodia" className="condensed text-3xl font-extrabold">
              ¿Dónde está ahora?
            </h2>
            <CustodyBadge custody={post.custody.status} />
          </div>
          <CustodyFields
            value={custody}
            onChange={setCustody}
            shelters={shelters}
            origin={foundLocation}
            errors={errors}
          />
          <Button
            variant="ink"
            disabled={pending}
            className="self-start"
            onClick={() =>
              run(() => updateCustody(post.id, token, custodyInput(custody)), "Cambios guardados.")
            }
          >
            Guardar cambios
          </Button>
        </section>
      )}

      {!reunited && (
        <section className="flex flex-col gap-3" aria-labelledby="reunido">
          <h2 id="reunido" className="condensed text-3xl font-extrabold">
            ¿Ha vuelto con su familia?
          </h2>
          <p>La publicación mostrará que ya está en casa y se archivará en 7 días.</p>
          {confirm === "reunited" ? (
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    () => markReunited(post.id, token),
                    "¡Qué buena noticia! Marcado como reunido.",
                  )
                }
              >
                Sí, ya está con su familia
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button className="self-start" onClick={() => setConfirm("reunited")}>
              Marcar como reunido
            </Button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="borrar">
        <h2 id="borrar" className="condensed text-3xl font-extrabold">
          Borrar la publicación
        </h2>
        <p>Se borrarán la foto, los datos y todos los avistamientos. No se puede deshacer.</p>
        {confirm === "delete" ? (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  const r = await deletePost(post.id, token);
                  if (r.ok) setDeleted(true);
                  else setMessage(r.error);
                });
              }}
            >
              Sí, borrar definitivamente
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="self-start" onClick={() => setConfirm("delete")}>
            Borrar publicación
          </Button>
        )}
      </section>
    </div>
  );
}
