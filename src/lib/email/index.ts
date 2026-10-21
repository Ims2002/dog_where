import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

import type { EmailContent } from "./templates";

const log = createLogger("email");

let resend: Resend | undefined;

/** Plantilla de email (sirve para el evento y los logs, nunca se registra el destinatario). */
export type EmailKind = "verify_email" | "reset_password" | "existing_account";

/**
 * Envía un email transaccional. Con RESEND_API_KEY usa Resend; sin ella, en desarrollo
 * escribe el enlace en la terminal para poder probar el flujo sin enviar nada.
 * No lanza: un fallo de envío se registra y la petición sigue (Better Auth no expone
 * al usuario si el email existe o no).
 */
export async function sendEmail(kind: EmailKind, to: string, content: EmailContent) {
  const apiKey = env.resendApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      log.error("email.not_configured", { kind });
      return;
    }
    // Solo en local: el enlace (con su token) va directo a la terminal, no al logger,
    // que lo taparía. Es lo que necesitas para seguir el flujo sin enviar emails.
    const link = content.text.match(/https?:\/\/\S+/)?.[0];
    log.info("email.dev_preview", { kind });
    process.stdout.write(`\n  📧 [solo desarrollo] ${content.subject}\n     ${link}\n\n`);
    return;
  }

  resend ??= new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: env.emailFrom(),
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (error) {
      log.error("email.send_failed", { kind, code: error.name }, new Error(error.message));
      return;
    }
    log.info("email.sent", { kind, emailId: data?.id });
  } catch (error) {
    log.error("email.send_failed", { kind }, error);
  }
}
