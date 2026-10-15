"use client";

import { useEffect, type ComponentProps, type RefObject } from "react";

import { toDateTimeLocalValue } from "@/lib/format";

import { Input } from "./field";

/**
 * <input type="datetime-local"> que se rellena con la hora actual al montarse en el
 * navegador (no en el prerender) y no permite fechas futuras. No controlado: el
 * valor se lee del ref al enviar.
 */
export function NowDateTimeInput({
  inputRef,
  ...props
}: Omit<ComponentProps<"input">, "type" | "ref"> & {
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const now = toDateTimeLocalValue(new Date());
    el.max = now;
    if (!el.value) el.value = now;
  }, [inputRef]);

  return <Input ref={inputRef} type="datetime-local" {...props} />;
}

/** Lee el valor del input como ISO (o "" si está vacío). */
export function readDateTime(ref: RefObject<HTMLInputElement | null>) {
  const value = ref.current?.value;
  return value ? new Date(value).toISOString() : "";
}
