"use client";

import { useRef } from "react";

import { HONEYPOT_FIELD } from "@/lib/anti-spam/limits";

/**
 * Campo trampa anti-bots: fuera de la pantalla, fuera del orden de tabulación y oculto a
 * lectores de pantalla. Una persona nunca lo rellena; muchos bots sí.
 *
 *   const honeypot = useHoneypot();
 *   <form>{honeypot.field} …</form>
 *   await action({ ...input, ...honeypot.value() });
 */
export function useHoneypot() {
  const ref = useRef<HTMLInputElement>(null);
  const field = (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        No rellenes este campo
        <input ref={ref} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
  return {
    field,
    value: () => ({ [HONEYPOT_FIELD]: ref.current?.value ?? "" }),
  };
}
