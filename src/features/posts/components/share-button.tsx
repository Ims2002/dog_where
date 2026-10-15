"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Compartir la publicación (WhatsApp, etc.) o copiar el enlace. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // cancelado por el usuario: no hacemos nada
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button variant="outline" onClick={share}>
      {copied ? "Enlace copiado" : "Compartir"}
    </Button>
  );
}
