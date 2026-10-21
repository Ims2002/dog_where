import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { deletePostsByAuthor } from "@/features/posts/owner";
import { getDb } from "@/lib/db";
import { accounts, rateLimits, sessions, users, verifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import * as emails from "@/lib/email/templates";
import { authBaseUrl, env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

import { createAppleClientSecret } from "./apple-secret";
import { appleCredentials, emailPasswordEnabled, googleCredentials } from "./providers";

const log = createLogger("auth");

const HOUR = 3600;
const DAY = 24 * HOUR;

/** De qué forma se ha entrado o registrado, a partir de la ruta de Better Auth. */
function methodFromPath(path: string | undefined) {
  if (!path) return "unknown";
  if (path.startsWith("/callback/")) return path.slice("/callback/".length);
  if (path.includes("email")) return "email";
  if (path.includes("reset-password")) return "reset_password";
  return path.replace(/^\//, "");
}

function socialProviders() {
  const google = googleCredentials();
  const apple = appleCredentials();
  return {
    ...(google && { google: { ...google, prompt: "select_account" as const } }),
    ...(apple && {
      apple: {
        clientId: apple.clientId,
        clientSecret: createAppleClientSecret(apple),
      },
    }),
  };
}

function createAuth() {
  const baseURL = authBaseUrl();
  return betterAuth({
    appName: "DogWhere",
    baseURL,
    secret: env.authSecret(),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    telemetry: { enabled: false },
    logger: {
      level: "warn",
      log: (level, message, ...args) => {
        const event = "auth.library";
        const cause = args.find((a) => a instanceof Error);
        if (level === "error") log.error(event, { message }, cause ?? new Error(message));
        else if (level === "warn") log.warn(event, { message });
        else log.debug(event, { message });
      },
    },

    emailAndPassword: {
      enabled: emailPasswordEnabled(),
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: HOUR,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail("reset_password", user.email, emails.resetPassword(user.name, url));
      },
      onPasswordReset: async ({ user }) => {
        log.info("auth.password_reset", { userId: user.id });
      },
      // Registro con un email que ya existe: se avisa al dueño en lugar de revelarlo.
      onExistingUserSignUp: async ({ user }) => {
        await sendEmail(
          "existing_account",
          user.email,
          emails.existingAccount(user.name, `${baseURL}/entrar`),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: HOUR,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail("verify_email", user.email, emails.verifyEmail(user.name, url));
      },
      afterEmailVerification: async (user) => {
        log.info("auth.email_verified", { userId: user.id });
      },
    },

    socialProviders: socialProviders(),
    // Apple devuelve el login con un POST desde su dominio.
    trustedOrigins: ["https://appleid.apple.com"],
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
    },

    session: {
      expiresIn: 30 * DAY,
      updateAge: DAY,
      freshAge: DAY,
      // Evita una consulta a la BD por página: la sesión va firmada en una cookie 5 min.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const { posts } = await deletePostsByAuthor(user.id);
          log.info("user.deleted", { userId: user.id, posts });
        },
      },
    },

    rateLimit: {
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: HOUR, max: 5 },
        "/request-password-reset": { window: HOUR, max: 3 },
        "/send-verification-email": { window: HOUR, max: 3 },
        "/delete-user": { window: HOUR, max: 5 },
      },
    },
    advanced: {
      // Vercel pone la IP real del cliente en x-real-ip.
      ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user, ctx) => {
            log.info("user.registered", { userId: user.id, method: methodFromPath(ctx?.path) });
          },
        },
      },
      session: {
        create: {
          after: async (session, ctx) => {
            log.info("auth.signed_in", {
              userId: session.userId,
              method: methodFromPath(ctx?.path),
            });
          },
        },
      },
      account: {
        create: {
          after: async (account) => {
            log.info("auth.account_linked", {
              userId: account.userId,
              provider: account.providerId,
            });
          },
        },
      },
    },

    plugins: [nextCookies()], // siempre el último
  });
}

type Auth = ReturnType<typeof createAuth>;
let auth: Auth | undefined;

/** Instancia de Better Auth. Se crea en el primer uso (no en el build). */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
