import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** Mensaje de error o de éxito de un formulario, anunciado a lectores de pantalla. */
export function FormAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border-2 px-3 py-2 text-sm font-semibold",
        tone === "error" ? "border-danger text-danger" : "border-ink bg-signal/40 text-ink",
      )}
    >
      {children}
    </p>
  );
}
