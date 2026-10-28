import "server-only";

import { Resend } from "resend";

import { createLogger } from "@/lib/logger";

import type { EmailContent } from "./templates";
import { emailTransport } from "./transport";

const log = createLogger("email");

let resend: Resend | undefined;

/** Plantilla de email (sirve para el evento y los logs, nunca se registra el destinatario). */
export type EmailKind = "verify_email" | "reset_password" | "existing_account";

/**
 * Envía un email transaccional por Resend o SMTP (ver transport.ts). Sin ninguno, en
 * desarrollo escribe el enlace en la terminal para poder probar el flujo.
 * No lanza: un fallo de envío se registra y la petición sigue (Better Auth no expone
 * al usuario si el email existe o no).
 */
export async function sendEmail(kind: EmailKind, to: string, content: EmailContent) {
  const transport = emailTransport();
  if (!transport) {
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

  const message = { to, subject: content.subject, html: content.html, text: content.text };
  try {
    if (transport.kind === "resend") {
      resend ??= new Resend(transport.apiKey);
      const { data, error } = await resend.emails.send({ from: transport.from, ...message });
      if (error) {
        log.error(
          "email.send_failed",
          { kind, via: "resend", code: error.name },
          new Error(error.message),
        );
        return;
      }
      log.info("email.sent", { kind, via: "resend", emailId: data?.id });
      return;
    }

    // SMTP: import dinámico para no cargar nodemailer si no se usa.
    const { createTransport } = await import("nodemailer");
    const smtp = createTransport({
      host: transport.host,
      port: transport.port,
      secure: transport.secure,
      auth: { user: transport.user, pass: transport.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const info = await smtp.sendMail({ from: transport.from, ...message });
    log.info("email.sent", { kind, via: "smtp", emailId: info.messageId });
  } catch (error) {
    log.error("email.send_failed", { kind, via: transport.kind }, error);
  }
}
