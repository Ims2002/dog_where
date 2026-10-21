/**
 * Plantillas de los emails de cuenta. HTML sencillo con estilos en línea (lo único que
 * respetan todos los clientes de correo) y versión de texto plano.
 */
export type EmailContent = { subject: string; html: string; text: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(opts: { title: string; intro: string; cta: string; url: string; outro: string }) {
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid #1d2433">
<tr><td style="background:#ffd23f;padding:14px 20px;font-weight:800;font-size:20px;letter-spacing:.5px">DOGWHERE</td></tr>
<tr><td style="padding:24px 20px">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">${escapeHtml(opts.title)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5">${escapeHtml(opts.intro)}</p>
<p style="margin:0 0 20px"><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#1d2433;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px">${escapeHtml(opts.cta)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#5b6170">Si el botón no funciona, copia este enlace en el navegador:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${escapeHtml(opts.url)}" style="color:#1d2433">${escapeHtml(opts.url)}</a></p>
<p style="margin:0;font-size:13px;color:#5b6170">${escapeHtml(opts.outro)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${opts.title}\n\n${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${opts.outro}\n\n— DogWhere`;
  return { html, text };
}

export function verifyEmail(name: string, url: string): EmailContent {
  return {
    subject: "Confirma tu email en DogWhere",
    ...layout({
      title: `Hola, ${name}`,
      intro: "Confirma tu email para activar tu cuenta de DogWhere.",
      cta: "Confirmar mi email",
      url,
      outro: "El enlace caduca en 1 hora. Si no has creado una cuenta, ignora este mensaje.",
    }),
  };
}

export function resetPassword(name: string, url: string): EmailContent {
  return {
    subject: "Cambia tu contraseña de DogWhere",
    ...layout({
      title: `Hola, ${name}`,
      intro: "Hemos recibido una petición para cambiar la contraseña de tu cuenta.",
      cta: "Elegir una contraseña nueva",
      url,
      outro:
        "El enlace caduca en 1 hora. Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.",
    }),
  };
}

export function existingAccount(name: string, url: string): EmailContent {
  return {
    subject: "Ya tienes una cuenta en DogWhere",
    ...layout({
      title: `Hola, ${name}`,
      intro:
        "Alguien ha intentado registrarse con tu email, pero ya tienes una cuenta. Puedes entrar con tu contraseña o con Google/Apple si los usaste.",
      cta: "Entrar en DogWhere",
      url,
      outro:
        "Si no recuerdas la contraseña, usa «¿Has olvidado tu contraseña?». Si no has sido tú, ignora este mensaje.",
    }),
  };
}
