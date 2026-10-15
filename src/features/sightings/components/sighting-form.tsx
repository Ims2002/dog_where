"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { LocationPicker } from "@/components/map/location-picker";
import type { LatLng } from "@/components/map/types";
import { PhotoInput, type UploadedPhoto } from "@/components/photo-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { NowDateTimeInput, readDateTime } from "@/components/ui/now-datetime-input";
import { toFieldErrors } from "@/lib/action-result";

import { createSighting } from "../actions";
import { createSightingSchema } from "../validation";

export function SightingForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [location, setLocation] = useState<LatLng | null>(null);
  const seenAtRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      postId,
      location: location ?? undefined,
      seenAt: readDateTime(seenAtRef),
      note: note || undefined,
      photoUrl: photo?.url,
      photoPathname: photo?.pathname,
      reporterName: reporterName || undefined,
    };
    const check = createSightingSchema.safeParse(input);
    if (!check.success) {
      setErrors(toFieldErrors(check.error));
      setFormError("Revisa los campos marcados.");
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await createSighting(check.data);
      if (result.ok) {
        router.push(`/mascota/${postId}`);
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <LocationPicker
        label="¿Dónde lo has visto?"
        value={location}
        onChange={setLocation}
        hint="Marca el sitio en la calle. Si estás en casa, mueve el punto a donde lo viste: este punto se muestra casi exacto."
        error={
          errors.location || errors["location.lat"]
            ? "Marca en el mapa dónde lo has visto."
            : undefined
        }
      />
      <Field label="¿Cuándo?" error={errors.seenAt}>
        {(a) => <NowDateTimeInput {...a} inputRef={seenAtRef} />}
      </Field>
      <Field label="Nota" optional hint="Hacia dónde iba, si estaba herido…" error={errors.note}>
        {(a) => (
          <Textarea {...a} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        )}
      </Field>
      <PhotoInput folder="sightings" label="Foto" optional value={photo} onChange={setPhoto} />
      <Field label="Tu nombre" optional error={errors.reporterName}>
        {(a) => (
          <Input
            {...a}
            value={reporterName}
            maxLength={80}
            onChange={(e) => setReporterName(e.target.value)}
          />
        )}
      </Field>
      {formError && (
        <p className="text-danger font-semibold" role="alert">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Guardando…" : "Añadir avistamiento"}
      </Button>
    </form>
  );
}
