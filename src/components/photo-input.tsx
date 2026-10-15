"use client";

import { useId, useState } from "react";

import { uploadPhoto } from "@/features/posts/actions";
import { compressImage } from "@/lib/image-client";

export type UploadedPhoto = { url: string; pathname: string };

type Props = {
  folder: "posts" | "sightings";
  value: UploadedPhoto | null;
  onChange: (photo: UploadedPhoto | null) => void;
  label: string;
  optional?: boolean;
  error?: string;
};

/** Elegir/hacer una foto, comprimirla en el navegador y subirla. */
export function PhotoInput({ folder, value, onChange, label, optional, error }: Props) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("uploading");
    setMessage(null);
    onChange(null);
    try {
      const compressed = await compressImage(file);
      setPreview(URL.createObjectURL(compressed));
      const body = new FormData();
      body.set("file", compressed);
      body.set("folder", folder);
      const result = await uploadPhoto(body);
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        onChange(null);
        return;
      }
      setStatus("idle");
      onChange(result.data);
    } catch {
      setStatus("error");
      setMessage("No hemos podido leer esa imagen. Prueba con otra foto.");
      onChange(null);
    }
  }

  const shown = preview ?? value?.url ?? null;
  const shownError = message ?? error;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold" id={`${id}-label`}>
        {label}
        {optional && <span className="text-ink-muted font-normal"> (opcional)</span>}
      </span>
      <label
        htmlFor={id}
        className="border-line bg-paper hover:border-ink has-[:focus-visible]:outline-shelter relative flex aspect-[4/3] w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-md border-2 border-dashed text-center has-[:focus-visible]:outline-3"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img
            src={shown}
            alt="Vista previa de la foto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <span className="condensed text-2xl font-extrabold">Hacer o elegir foto</span>
            <span className="text-ink-muted text-sm">Que se le vea bien la cara y el cuerpo</span>
          </>
        )}
        {status === "uploading" && (
          <span className="bg-paper/90 absolute inset-x-0 bottom-0 py-2 text-sm font-semibold">
            Subiendo foto…
          </span>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${id}-label`}
          aria-invalid={shownError ? true : undefined}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {shown && status !== "uploading" && (
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-semibold underline underline-offset-4"
        >
          Cambiar foto
        </label>
      )}
      {shownError && (
        <p className="text-danger text-sm font-semibold" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
