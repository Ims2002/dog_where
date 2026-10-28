/** Errores de Better Auth → mensajes en español para la interfaz. */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El email o la contraseña no son correctos.",
  INVALID_EMAIL: "Ese email no parece válido.",
  INVALID_PASSWORD: "La contraseña no es correcta.",
  EMAIL_NOT_VERIFIED:
    "Todavía no has confirmado tu email. Te acabamos de reenviar el enlace: revisa tu correo (y la carpeta de spam).",
  PASSWORD_TOO_SHORT: "La contraseña tiene que tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  USER_ALREADY_EXISTS: "Ya hay una cuenta con ese email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya hay una cuenta con ese email.",
  INVALID_TOKEN: "El enlace no es válido o ya se ha usado. Pide uno nuevo.",
  TOKEN_EXPIRED: "El enlace ha caducado. Pide uno nuevo.",
  SESSION_EXPIRED: "Por seguridad, vuelve a entrar en tu cuenta y repite la acción.",
  SESSION_NOT_FRESH: "Por seguridad, vuelve a entrar en tu cuenta y repite la acción.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Tu cuenta no tiene contraseña: entras con Google o Apple.",
  USER_ALREADY_HAS_PASSWORD: "Escribe tu contraseña para confirmar.",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "No puedes quitar tu único método de acceso.",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Esa cuenta ya está vinculada a otro usuario.",
  ACCOUNT_NOT_LINKED:
    "Ya tienes una cuenta con ese email. Entra con tu contraseña y vincula el método desde «Mi cuenta».",
  account_not_linked:
    "Ya tienes una cuenta con ese email. Entra con tu contraseña y vincula el método desde «Mi cuenta».",
  access_denied: "Has cancelado el acceso.",
  email_not_found: "Ese proveedor no nos ha dado tu email. Prueba con otro método.",
  state_mismatch:
    "El acceso ha caducado o se abrió en otra pestaña o dirección. Vuelve a intentarlo desde esta página.",
  state_not_found:
    "El acceso ha caducado o se abrió en otra pestaña o dirección. Vuelve a intentarlo desde esta página.",
  please_restart_the_process: "El acceso ha caducado. Vuelve a intentarlo.",
  invalid_code: "Google no ha confirmado el acceso. Vuelve a intentarlo.",
  no_code: "Google no ha confirmado el acceso. Vuelve a intentarlo.",
  unable_to_get_user_info: "No hemos podido leer tu perfil del proveedor. Vuelve a intentarlo.",
  user_creation_failed: "No hemos podido crear tu cuenta. Inténtalo de nuevo en un momento.",
  unable_to_link_account:
    "Ya tienes una cuenta con ese email. Entra con tu contraseña y vincula el método desde «Mi cuenta».",
  email_not_verified:
    "Ya hay una cuenta con ese email sin confirmar. Confírmala desde el enlace que te enviamos, o recupera la contraseña.",
};

const RATE_LIMITED = "Demasiados intentos. Espera unos minutos y vuelve a probar.";
const GENERIC = "Algo ha fallado. Inténtalo de nuevo.";

type AuthError = { code?: string; status?: number; message?: string } | null | undefined;

export function authErrorMessage(error: AuthError): string {
  if (!error) return GENERIC;
  if (error.status === 429) return RATE_LIMITED;
  return (error.code && MESSAGES[error.code]) || GENERIC;
}

/** Error que llega en la URL tras un login social fallido (?error=…). */
export function callbackErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return (
    MESSAGES[code] ??
    MESSAGES[code.toUpperCase()] ??
    // El código ayuda a diagnosticar y no es información sensible.
    `No se ha podido completar el acceso. Inténtalo de nuevo. (Código: ${code.slice(0, 40)})`
  );
}
