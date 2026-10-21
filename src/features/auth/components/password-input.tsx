"use client";

import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/field";

/** Campo de contraseña con botón para mostrarla (útil en el móvil). */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-20" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-ink-muted absolute inset-y-0 right-0 min-w-16 px-3 text-sm font-semibold underline-offset-4 hover:underline"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}
