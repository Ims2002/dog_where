import { describe, expect, it } from "vitest";

import { emailTransport } from "./transport";

describe("emailTransport", () => {
  it("sin configuración no hay transporte", () => {
    expect(emailTransport({})).toBeNull();
  });

  it("Resend tiene prioridad", () => {
    const t = emailTransport({
      RESEND_API_KEY: "re_x",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_USER: "a",
      SMTP_PASS: "b",
    });
    expect(t).toMatchObject({ kind: "resend", from: "DogWhere <onboarding@resend.dev>" });
  });

  it("Gmail por SMTP: puerto 465 seguro, quita espacios y usa la cuenta como remitente", () => {
    const t = emailTransport({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_USER: "dogwhere@gmail.com",
      SMTP_PASS: "abcd efgh ijkl mnop",
    });
    expect(t).toEqual({
      kind: "smtp",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: "dogwhere@gmail.com",
      pass: "abcdefghijklmnop",
      from: "DogWhere <dogwhere@gmail.com>",
    });
  });

  it("puerto 587 usa STARTTLS y respeta EMAIL_FROM", () => {
    const t = emailTransport({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "u",
      SMTP_PASS: "p a s s",
      EMAIL_FROM: "DogWhere <hola@example.com>",
    });
    expect(t).toMatchObject({
      port: 587,
      secure: false,
      pass: "p a s s",
      from: "DogWhere <hola@example.com>",
    });
  });
});
