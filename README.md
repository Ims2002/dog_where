# DogWhere 🐾

Publica la foto de un animal que has encontrado o visto suelto —con los datos de su chapa si la lleva— para que su familia pueda encontrarlo.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase (Postgres) + Drizzle · Vercel Blob · Better Auth + emails (Gmail SMTP o Resend) · Vercel

## Puesta en marcha

Requisitos: Node.js 22+ y npm. Base de datos: un proyecto de Supabase (o, opcionalmente, cualquier Postgres local; ver [GUIDELINES.md § 6](docs/GUIDELINES.md#6-base-de-datos)).

```bash
npm install
cp .env.example .env.local      # o: npx vercel link && npx vercel env pull .env.local
npm run db:migrate              # necesita POSTGRES_URL_NON_POOLING (o DATABASE_URL)
npm run db:seed:shelters        # carga las protectoras de data/shelters.json
npm run dev
```

Abre http://localhost:3000. Comprobación de salud: http://localhost:3000/api/health

En local puedes crear cuentas sin configurar nada más: los enlaces de los emails (confirmar cuenta, cambiar contraseña) salen en la terminal de `npm run dev`.

## Scripts

| Script                      | Qué hace                                                     |
| --------------------------- | ------------------------------------------------------------ |
| `npm run dev`               | Servidor de desarrollo                                       |
| `npm run build` / `start`   | Build y servidor de producción                               |
| `npm run check`             | Lint + tipos + formato + tests (lo mismo que la CI)          |
| `npm run lint` / `lint:fix` | ESLint                                                       |
| `npm run typecheck`         | Tipos de rutas + `tsc --noEmit`                              |
| `npm run format`            | Prettier                                                     |
| `npm test` / `test:watch`   | Vitest                                                       |
| `npm run db:generate`       | Genera una migración desde el esquema                        |
| `npm run db:migrate`        | Aplica migraciones                                           |
| `npm run db:studio`         | Drizzle Studio                                               |
| `npm run db:status`         | A qué BD apunta `.env.local`, migraciones aplicadas y tablas |
| `npm run db:seed:shelters`  | Carga o actualiza las protectoras de `data/shelters.json`    |
| `npm run db:seed:demo`      | Crea 9 publicaciones de prueba (`-- --clean` las borra)      |

## Cuentas (Better Auth)

Las cuentas son opcionales: publicar y avisar de un avistamiento siguen funcionando sin registro. Métodos: email + contraseña (con verificación y recuperación), Google y Apple. **Cada botón social solo aparece si sus variables están configuradas**, y en producción el acceso con email se oculta mientras no haya forma de enviar emails, Gmail o Resend (sin emails no se podría confirmar la cuenta). Sin ningún método configurado, `/entrar` dice que las cuentas llegarán pronto.

### 1. Imprescindible en producción

- `BETTER_AUTH_SECRET`: genera uno con `openssl rand -base64 32` y ponlo en Vercel (Production y Preview).
- **Emails** (confirmación de cuenta y cambio de contraseña). Elige **una** de estas dos opciones:

  **Opción A — Gmail (sin dominio propio, para empezar).** Hasta unos 500 emails al día, enviados desde tu cuenta de Gmail.
  1. Mejor con una cuenta de Gmail solo para la app (p. ej. `dogwhere.app@gmail.com`): será el remitente que vea la gente.
  2. En esa cuenta, activa la **verificación en dos pasos** (myaccount.google.com → Seguridad).
  3. Ve a myaccount.google.com/apppasswords, crea una contraseña de aplicación llamada "DogWhere" y copia los 16 caracteres.
  4. En Vercel: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<la cuenta de Gmail>`, `SMTP_PASS=<la contraseña de aplicación>`.

  **Opción B — Resend (con dominio propio, recomendado a largo plazo):**
  1. Crea una cuenta en resend.com y añade tu dominio en **Domains**; copia los registros DNS que te da en tu proveedor de dominio y espera a que salga _Verified_.
  2. **API Keys → Create** con permiso _Sending access_ → `RESEND_API_KEY`.
  3. `EMAIL_FROM`, p. ej. `DogWhere <hola@tudominio.com>` (del dominio verificado). Si hay `RESEND_API_KEY`, tiene prioridad sobre Gmail.

  > Sin dominio propio puedes probar con `onboarding@resend.dev`, pero Resend solo entrega a tu propio email: nadie más podría confirmar su cuenta.

### 2. Google

1. [Google Cloud Console](https://console.cloud.google.com/) → crea un proyecto → **Google Auth Platform**.
2. _Branding_: nombre "DogWhere", email de soporte y dominio. _Audience_: **External** y, cuando lo hayas probado, **Publish app**.
3. _Clients → Create client → Web application_:
   - Orígenes autorizados: `https://dogwhere-three.vercel.app` (y `http://localhost:3000` para probar en local).
   - URIs de redirección: `https://dogwhere-three.vercel.app/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google`).
4. Copia el _Client ID_ y el _Client secret_ en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

### 3. Apple (cuando tengas cuenta de Apple Developer, 99 $/año)

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers → App IDs**: crea uno con la capacidad _Sign in with Apple_.
2. **Identifiers → Services IDs**: crea uno (p. ej. `com.dogwhere.web`) → es tu `APPLE_CLIENT_ID`. Actívale _Sign in with Apple → Configure_:
   - Dominio: `dogwhere-three.vercel.app`
   - Return URL: `https://dogwhere-three.vercel.app/api/auth/callback/apple`
3. **Keys**: crea una clave con _Sign in with Apple_, descárgala (`.p8`, solo se puede una vez) → su _Key ID_ es `APPLE_KEY_ID` y el contenido del archivo, `APPLE_PRIVATE_KEY`.
4. Tu _Team ID_ (arriba a la derecha en la web de Apple Developer) → `APPLE_TEAM_ID`.

Apple no permite `localhost`: se prueba en producción o en una preview con dominio propio. La app firma sola el _client secret_ que pide Apple.

Tras añadir o cambiar variables en Vercel, haz un **Redeploy** para que se apliquen.

## Documentación

- [Guía de desarrollo](docs/GUIDELINES.md) — estándares del proyecto (léela antes de contribuir)
- [Arquitectura](docs/ARCHITECTURE.md) — componentes, modelo de datos y decisiones
- [Logs](docs/LOGGING.md) — cómo se registran los eventos, dónde verlos y catálogo
- [Roadmap](docs/ROADMAP.md)

## Despliegue

Cada push a `main` despliega en producción en Vercel; cada PR genera una preview. Configuración inicial en [GUIDELINES.md § 12](docs/GUIDELINES.md#12-despliegue-en-vercel).
