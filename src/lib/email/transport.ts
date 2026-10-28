/**
 * Qué servicio envía los emails, según las variables de entorno:
 * - Resend (RESEND_API_KEY): lo recomendado con un dominio propio.
 * - SMTP (SMTP_HOST + SMTP_USER + SMTP_PASS): p. ej. una cuenta de Gmail con contraseña de
 *   aplicación. Sirve sin dominio propio; Gmail permite unos 500 emails al día.
 * Sin ninguno, en desarrollo los enlaces salen en la terminal.
 */
type Env = Record<string, string | undefined>;

export type EmailTransport =
  | { kind: "resend"; apiKey: string; from: string }
  | {
      kind: "smtp";
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    };

export function emailTransport(e: Env = process.env): EmailTransport | null {
  if (e.RESEND_API_KEY) {
    return {
      kind: "resend",
      apiKey: e.RESEND_API_KEY,
      from: e.EMAIL_FROM || "DogWhere <onboarding@resend.dev>",
    };
  }
  if (e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS) {
    const port = Number(e.SMTP_PORT) || 465;
    const isGmail = /(^|\.)gmail\.com$/i.test(e.SMTP_HOST);
    return {
      kind: "smtp",
      host: e.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS directo; 587 = STARTTLS
      user: e.SMTP_USER,
      // Google muestra la contraseña de aplicación en grupos con espacios: se quitan.
      pass: isGmail ? e.SMTP_PASS.replace(/\s+/g, "") : e.SMTP_PASS,
      // Gmail solo deja enviar desde la propia cuenta.
      from: e.EMAIL_FROM || `DogWhere <${e.SMTP_USER}>`,
    };
  }
  return null;
}
