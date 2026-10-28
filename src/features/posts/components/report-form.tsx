"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { useHoneypot } from "@/components/ui/honeypot";

import { reportPost } from "../actions";

const REASONS = [
  ["spam", "Es spam o publicidad"],
  ["inappropriate", "Contenido inapropiado"],
  ["wrong_info", "La información es falsa o incorrecta"],
  ["other", "Otro motivo"],
] as const;

export function ReportForm({ postId }: { postId: string }) {
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("spam");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const honeypot = useHoneypot();

  function submit() {
    startTransition(async () => {
      const r = await reportPost({
        postId,
        reason,
        details: details || undefined,
        ...honeypot.value(),
      });
      setResult(r.ok ? "Denuncia enviada. La revisaremos." : r.error);
    });
  }

  return (
    <details className="text-sm">
      <summary className="text-ink-muted cursor-pointer underline underline-offset-4">
        Denunciar esta publicación
      </summary>
      {result ? (
        <p className="mt-3 font-semibold" role="status">
          {result}
        </p>
      ) : (
        <div className="relative mt-3 flex max-w-md flex-col gap-3">
          {honeypot.field}
          <label className="flex flex-col gap-1 font-semibold">
            Motivo
            <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {REASONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            Detalles <span className="text-ink-muted font-normal">(opcional)</span>
            <Textarea
              value={details}
              maxLength={500}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          <Button variant="danger" size="sm" onClick={submit} disabled={pending}>
            {pending ? "Enviando…" : "Enviar denuncia"}
          </Button>
        </div>
      )}
    </details>
  );
}
