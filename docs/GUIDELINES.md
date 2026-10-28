# Guía de desarrollo — DogWhere

Estándares del proyecto. Si algo de lo que vas a hacer contradice esta guía, o se cambia la guía en el mismo PR (explicando por qué) o se cambia el código. Nunca se ignora en silencio.

> Documentos relacionados: [ARCHITECTURE.md](./ARCHITECTURE.md) · [ROADMAP.md](./ROADMAP.md) · [`AGENTS.md`](../AGENTS.md)

---

## 1. Qué es y qué no es

**DogWhere** permite que quien encuentra un animal extraviado y no consigue contactar con su dueño publique un post con **foto, información y ubicación** (opcionalmente con los datos de su chapa) para que la familia pueda localizarlo.

Cada publicación indica **dónde está el animal ahora** (la _custodia_):

| Custodia      | Qué significa                                  | Qué se adjunta                                                         |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `with_finder` | Quien lo encontró se lo ha llevado a casa      | Opcionalmente, la ubicación de la casa (en público solo se ve la zona) |
| `at_shelter`  | Lo ha dejado en una protectora/perrera de alta | La protectora elegida (punto de referencia con dirección y horario)    |
| `not_caught`  | No se ha podido atrapar                        | Un **reguero de avistamientos** que cualquiera puede ir ampliando      |

La custodia puede cambiar: un animal `not_caught` pasa a `with_finder` o `at_shelter` cuando alguien consigue atraparlo.

Las **protectoras, perreras municipales y veterinarios colaboradores** se dan de alta como puntos de referencia (entidades públicas, con ubicación exacta). Solo las aprobadas pueden elegirse al publicar.

Principios de producto (deciden los empates):

1. **Publicar en menos de un minuto, desde el móvil.** Quien encuentra un perro lo tiene delante y una mano ocupada. Cada campo extra del formulario tiene que justificarse.
2. **Privacidad primero.** Manejamos teléfonos de terceros (el dueño, vía chapa) y ubicaciones. Ante la duda, se muestra menos (ver §8).
3. **Local.** El valor está en la cercanía: listados y búsquedas siempre ordenados por zona y fecha.
4. **Barato de operar.** Todo cabe en los planes gratuitos de Vercel + Supabase + Vercel Blob mientras el tráfico sea local.

Fuera de alcance del MVP: chat interno, pagos, app nativa, publicaciones de "se busca" por parte de dueños (está en el roadmap), panel propio para protectoras (en el MVP las da de alta un administrador).

---

## 2. Stack

| Capa          | Elección                                          | Notas                                                                      |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework     | **Next.js 16** (App Router, Cache Components)     | Server Components por defecto. Turbopack.                                  |
| Lenguaje      | **TypeScript** `strict`                           | Prohibido `any` explícito; usa `unknown` y estrecha.                       |
| Estilos       | **Tailwind CSS v4**                               | Tokens en `src/app/globals.css` (`@theme`).                                |
| Base de datos | **Postgres en Supabase** (vía Vercel Marketplace) | Driver `pg` contra el pooler de Supabase (modo transacción). RLS activado. |
| ORM           | **Drizzle ORM** + drizzle-kit                     | Esquema en `src/lib/db/schema.ts`, migraciones en `drizzle/`.              |
| Ficheros      | **Vercel Blob**                                   | Se comprime en el cliente y se sube con la Server Action `uploadPhoto`.    |
| Validación    | **Zod 4**                                         | Mismo esquema en cliente (UX) y servidor (seguridad).                      |
| Tests         | **Vitest**                                        | Playwright para e2e en fase 2.                                             |
| Calidad       | ESLint (config de Next) + Prettier                | `npm run check` lo ejecuta todo.                                           |
| Hosting       | **Vercel**, región `fra1`                         | Misma región que el proyecto de Supabase (Frankfurt, `eu-central-1`).      |

Mapas con **Leaflet + OpenStreetMap** (`src/components/map`). Cuentas con **Better Auth** (`src/lib/auth`; emails por Gmail SMTP o Resend, `src/lib/email`). Anti-spam propio en Postgres (`src/lib/anti-spam`). La justificación está en ARCHITECTURE.md.

> **Next.js 16 no es el Next.js "de siempre".** Antes de usar una API de Next, consulta la doc que viene en `node_modules/next/dist/docs/`. Especialmente: Cache Components (`"use cache"`, `cacheLife`, `cacheTag`) y `connection()`.

---

## 3. Estructura de carpetas

```
dog_where/
├── data/                    # Datos de carga (shelters.json)
├── docs/                    # Guía, arquitectura, roadmap
├── drizzle/                 # Migraciones SQL generadas (se commitean)
├── public/                  # Estáticos (en desarrollo, también dev-uploads/, ignorado por git)
├── scripts/                 # Scripts de mantenimiento (seed de protectoras)
└── src/
    ├── app/                 # SOLO rutas: page, layout, loading, error, route handlers
    │   └── api/             # health, cron/expire
    ├── components/
    │   ├── map/             # Mapa (Leaflet), selector de ubicación
    │   ├── ui/              # Primitivas genéricas (Button, Field, Badge…) sin lógica de negocio
    │   └── photo-input.tsx  # Foto: comprimir en el navegador + subir
    ├── features/            # Un directorio por dominio
    │   ├── posts/           # Publicaciones y su custodia
    │   │   ├── constants.ts     # Enums, límites, precisión pública, etiquetas de UI
    │   │   ├── validation.ts    # Esquemas Zod (compartidos cliente/servidor)
    │   │   ├── queries.ts       # Lecturas de BD   ("server-only")
    │   │   ├── actions.ts       # Server Actions   ("use server")
    │   │   ├── mappers.ts       # Post de BD → DTO público (aplica reglas de privacidad)
    │   │   └── components/      # Componentes propios del dominio
    │   ├── auth/            # Pantallas de cuenta: entrar, registro, contraseña, Mi cuenta
    │   ├── shelters/        # Protectoras, perreras y veterinarios (puntos de referencia)
    │   └── sightings/       # Reguero de avistamientos de animales sin capturar
    └── lib/                 # Transversal: db, env, auth, email, storage, tokens, format, geo…
```

Reglas:

- `src/app` **no contiene lógica de negocio**: importa de `features/` y compone.
- Un `feature` puede importar de `lib/` y `components/ui/`. De **otro feature** solo puede importar `constants`, tipos y `mappers` (p. ej. `posts` usa `toPublicShelter`); nunca sus `queries`, `actions` ni componentes. Si dos features necesitan la misma lógica, se sube a `lib/`.
- `lib/db/schema.ts` es la única pieza de `lib/` que conoce el dominio (importa los enums de `features/*/constants.ts`).
- Los tests van **junto al código** que prueban: `geo.ts` → `geo.test.ts`.

---

## 4. Convenciones de código

### Idioma

| Qué                                                                 | Idioma                            |
| ------------------------------------------------------------------- | --------------------------------- |
| Identificadores (variables, tablas, rutas de código)                | Inglés                            |
| Textos de la interfaz, URLs públicas (`/publicar`, `/mascota/[id]`) | Español                           |
| Comentarios, docs, mensajes de error al usuario                     | Español                           |
| Commits: tipo en inglés, descripción en español                     | `feat: formulario de publicación` |

### Nombres

| Elemento                      | Convención                    | Ejemplo           |
| ----------------------------- | ----------------------------- | ----------------- |
| Archivos y carpetas           | `kebab-case`                  | `post-card.tsx`   |
| Componentes React             | `PascalCase`                  | `PostCard`        |
| Funciones y variables         | `camelCase`                   | `getActivePosts`  |
| Constantes de módulo          | `UPPER_SNAKE_CASE`            | `MAX_PHOTO_BYTES` |
| Tipos e interfaces            | `PascalCase`, sin prefijo `I` | `PublicPost`      |
| Tablas y columnas en Postgres | `snake_case`                  | `photo_url`       |
| Booleanos                     | `is/has/can` + algo           | `hasTag`          |

### TypeScript

- `strict` siempre. Nada de `any`, `@ts-ignore` ni `!` (non-null assertion) salvo justificación en un comentario.
- Los tipos de dominio se **derivan**, no se duplican: `typeof posts.$inferSelect`, `z.infer<typeof schema>`.
- Exportaciones con nombre. `export default` solo donde Next lo exige (`page`, `layout`, configs).
- Imports absolutos con `@/` fuera del propio directorio.

### React y Next.js

- **Server Components por defecto.** `"use client"` solo en las hojas que lo necesitan (formularios, mapa, cámara) y lo más abajo posible del árbol.
- **Mutaciones con Server Actions** (`features/*/actions.ts`). Los Route Handlers (`app/api/*`) se reservan para: health check, webhooks y cron.
- **El acceso a BD vive solo en `queries.ts` y `actions.ts`**, que importan `server-only`. Ningún componente llama a `getDb()` directamente.
- **Caching (Cache Components):** los datos son dinámicos por defecto.
  - Lecturas que pueden cachearse (listado público, detalle) → `"use cache"` + `cacheLife(...)` + `cacheTag("posts")`.
  - Tras una mutación → `revalidateTag("posts")` (o el tag concreto, `post:<id>`).
  - Todo lo que sea dinámico y no cacheado va dentro de un `<Suspense>` con fallback.
- Cada ruta con datos tiene su `loading.tsx` y su `error.tsx`.

### Server Actions: contrato

Toda Server Action:

1. Envuelve su cuerpo en `runAction("dominio.accion", async () => …)` (ver §13): así queda registrada con su `requestId`, duración y resultado.
2. Valida la entrada con Zod en el servidor (aunque el cliente ya lo haya hecho).
3. Comprueba permisos (en cuanto exista auth).
4. Devuelve un resultado tipado; **no lanza excepciones para errores esperados**:

```ts
type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Las excepciones se reservan para lo inesperado (BD caída), que acaba en `error.tsx` y queda registrada como `action.error`.

### Estilo y formato

- Prettier decide el formato (no se discute en revisión). Ancho 100. El plugin de Tailwind ordena las clases.
- ESLint sin warnings en `main`.
- Funciones cortas y con un propósito. Si un componente pasa de ~150 líneas, se parte.
- Comentarios para el _por qué_, no el _qué_.

---

## 5. UI, estilos y accesibilidad

- **Móvil primero**: se diseña para 360 px y se amplía. Probar siempre en el móvil real antes de cerrar una feature visual.
- Colores, radios y fuentes salen de los tokens de `globals.css`; nada de hex sueltos en componentes.
- Modo claro y oscuro desde el principio (`prefers-color-scheme`).
- Accesibilidad (objetivo WCAG 2.1 AA):
  - Toda imagen tiene `alt` descriptivo (en publicaciones: especie + localidad, p. ej. "Perro encontrado en Benitachell").
  - Todo input tiene `<label>` visible. Los errores de validación se asocian con `aria-describedby`.
  - Objetivos táctiles de al menos 44×44 px. Foco visible siempre.
  - Contraste mínimo 4.5:1 en texto.
- Imágenes siempre con `next/image` y `sizes` correcto.

---

## 6. Base de datos

- El esquema vive en `src/lib/db/schema.ts`. Columnas en `snake_case`, propiedades TS en `camelCase`.
- Claves primarias `uuid` (no exponen el volumen de publicaciones). Fechas siempre `timestamptz`.
- Las reglas de coherencia que no dependen de la app van también en la BD como `CHECK` (p. ej. `custody = 'at_shelter'` ⇔ `shelter_id` no nulo). Zod da el error bonito; Postgres garantiza la integridad.
- Los valores de enums se definen **una vez** en `features/*/constants.ts` y se reutilizan en Drizzle (`pgEnum`) y Zod (`z.enum`).
- **Migraciones:**
  1. Cambia `schema.ts`.
  2. `npm run db:generate -- --name <descripcion>` → revisa el SQL generado en `drizzle/`.
  3. `npm run db:migrate` contra tu proyecto de desarrollo de Supabase (o tu Postgres local).
  4. Commitea el SQL junto al cambio de esquema, en el mismo PR.
  5. Nunca `drizzle-kit push` contra producción. Nunca editar una migración ya aplicada en producción.
- **Supabase solo como Postgres.** La app no usa el SDK de Supabase ni su API REST: se conecta con `pg` + Drizzle (`src/lib/db/client.ts`). En Vercel usa `POSTGRES_URL` (pooler en modo transacción, puerto 6543); las migraciones usan `POSTGRES_URL_NON_POOLING`.
- **RLS siempre activado, sin políticas.** Supabase publica las tablas del esquema `public` en una API REST accesible con la clave _publishable_, que es pública. Con RLS activo y sin políticas esa API no ve nada, mientras que la app (propietaria de las tablas) no está sujeta a RLS. **Toda tabla nueva lleva `.enableRLS()`.**
- **SSL:** Supabase usa su propia CA. `pgConfigFromUrl` (`src/lib/db/connection.ts`) cifra siempre la conexión; para verificar además el certificado, pon en `DATABASE_CA_CERT` el certificado que descargas en Supabase → _Database Settings → SSL Configuration_.
- Producción no se toca a mano: los cambios de esquema van siempre por migración.
- Desarrollo: lo más sencillo es un segundo proyecto gratuito de Supabase (`dogwhere-dev`) con sus URLs en `.env.local`. Si prefieres trabajar sin conexión, vale cualquier Postgres local (opcional):
  ```bash
  docker run -d --name dogwhere-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
  # .env.local → DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres (sin POSTGRES_URL)
  npm run db:migrate && npm run db:seed:shelters
  ```
- Las lecturas cacheadas (`"use cache"`) llevan siempre `cacheTag` y `cacheLife`. Tras escribir, las Server Actions llaman a `updateTag` (el usuario ve su cambio al momento); el cron usa `revalidateTag(tag, "max")`.

---

## 7. Fotos (Vercel Blob)

- Tipos permitidos: JPEG, PNG, WebP. Máximo 3,5 MB tras comprimir (`MAX_PHOTO_BYTES`), por debajo del `bodySizeLimit` de 4 MB de las Server Actions.
- **Antes de subir**, el cliente redimensiona (lado mayor ≤ 1600 px) y re-codifica a WebP con `<canvas>`. Esto reduce peso y **elimina los metadatos EXIF, incluida la ubicación GPS** de la foto.
- La foto ya comprimida (unos cientos de KB) se envía a la Server Action `uploadPhoto`, que vuelve a comprobar tipo y tamaño y la guarda con `putPhoto` (`src/lib/storage.ts`). Así toda la validación ocurre en el servidor y no hace falta un endpoint de tokens.
- En desarrollo, sin `BLOB_READ_WRITE_TOKEN`, las fotos se guardan en `public/dev-uploads/` para poder trabajar sin Vercel.
- El servidor solo acepta `photoUrl` de `*.public.blob.vercel-storage.com` (o `/dev-uploads/` fuera de producción), validado en `blobUrlSchema`.
- Al borrar o caducar una publicación se borran también su foto y las de sus avistamientos (`deletePhotos`, que nunca rompe la operación si Blob falla).

---

## 8. Privacidad y RGPD

Estamos en España: aplica el RGPD y la LOPDGDD. El teléfono de una chapa es un **dato personal del dueño**, que no nos ha dado su consentimiento, y la ubicación de una casa particular es un dato personal de quien acoge al animal. Reglas no negociables (las precisiones están centralizadas en `PUBLIC_DECIMALS`):

| Dato                        | Se guarda     | Se muestra en público                                                   |
| --------------------------- | ------------- | ----------------------------------------------------------------------- |
| Teléfono de la chapa        | Sí            | **Solo enmascarado**: `••• ••• 678` (`maskPhone`)                       |
| Texto de la chapa (nombre…) | Sí            | Sí (el nombre del animal ayuda a reconocerlo)                           |
| Lugar del hallazgo          | Sí            | **Redondeado** a ~100 m                                                 |
| Casa de quien lo acoge      | Sí (opcional) | **Solo la zona**, redondeada a ~1 km. La dirección se pide por contacto |
| Avistamientos en la calle   | Sí            | Precisión alta (~11 m): sirven para atraparlo                           |
| Protectoras / perreras      | Sí            | Completo (dirección, teléfono, horario): son entidades, no personas     |
| Localidad                   | Sí            | Sí                                                                      |
| Contacto de quien publica   | Sí            | Sí — lo elige y escribe él, sabiendo que será público                   |
| Metadatos EXIF de la foto   | **No**        | —                                                                       |

Así el dueño reconoce su número por los últimos dígitos y contacta con quien encontró al animal; nunca publicamos el teléfono completo de un tercero.

Además:

- Si un avistamiento se hace desde casa, la UI avisa de que su ubicación será casi exacta y ofrece mover el pin a la calle.
- Toda publicación caduca a los **60 días** (`POST_TTL_DAYS`) y se archiva; los datos de chapa se borran al archivar.
- La conversión de `Post` (BD) a lo que ve el cliente pasa **siempre** por un mapper (`features/posts/mappers.ts` → `toPublicPost`). Nunca se envía un `Post` crudo a un Client Component.
- Antes del lanzamiento: Aviso legal, Política de privacidad y aviso de cookies. Usamos Vercel Web Analytics (sin cookies) para no necesitar banner de consentimiento.
- Quien publica puede borrar su publicación (y con ella su reguero de avistamientos). Cualquiera puede denunciarla (tabla `reports`).
- **Cuentas:** el email de un usuario nunca se muestra en público ni sale en los logs (se registra solo su `userId`). Borrar la cuenta borra sus publicaciones, sesiones y métodos de acceso. La cookie de sesión es técnica (no necesita consentimiento); la política de privacidad lo explica.

---

## 9. Seguridad

- Secretos solo en variables de entorno de Vercel y en `.env.local` (ignorado por git). `.env.example` documenta todas las variables, sin valores.
- Las variables de servidor se leen con `env.*()` de `src/lib/env.ts` (validadas con Zod al usarse). Solo lo prefijado con `NEXT_PUBLIC_` llega al navegador.
- **Enlace de gestión:** al publicar se genera un token aleatorio; en la BD solo se guarda su SHA-256 y se compara en tiempo constante. La ruta `/gestionar/*` se sirve con `Referrer-Policy: no-referrer` y `noindex`.
- El cron (`/api/cron/expire`) exige `Authorization: Bearer $CRON_SECRET`.
- **Cuentas (Better Auth):**
  - La sesión del servidor se lee siempre con `getSession()` / `getCurrentUser()` de `src/lib/auth/session.ts`, dentro de un `<Suspense>` (lee cookies). En el cliente, `authClient` de `src/lib/auth/client.ts`.
  - Lo que exija dueño se comprueba **en el servidor** (`authorize()` en las acciones de posts): o el token del enlace o `session.user.id === post.authorId`. Ocultar un botón no es seguridad.
  - Cualquier redirección tras entrar pasa por `safeNext()` (solo rutas internas).
  - Los mensajes no revelan si un email está registrado (registro y recuperación responden igual).
  - Contraseñas: mínimo 8, hash scrypt (Better Auth). Al restablecerla o cambiarla se cierran las demás sesiones.
  - Las rutas con tokens en la URL (`/restablecer`) llevan `Referrer-Policy: no-referrer`, y el logger tapa `?token=`, `?code=`, `?state=` y `/reset-password/<token>`.
  - Tablas nuevas de auth: también con `.enableRLS()`.
- Toda entrada de usuario se valida en el servidor. Nada de `dangerouslySetInnerHTML` con contenido de usuario.
- Cabeceras de seguridad definidas en `next.config.ts` (`nosniff`, `X-Frame-Options`, `Permissions-Policy` limitada a cámara y geolocalización).
- Los avistamientos se pueden añadir sin cuenta, así que son lo más expuesto a spam: límite de `MAX_SIGHTINGS_PER_POST` por publicación desde el MVP, y solo se aceptan en publicaciones `active` con custodia `not_caught`.
- Las protectoras se crean en estado `pending` y solo un administrador las pasa a `approved`. Nunca se puede elegir una protectora no aprobada.
- **Anti-spam** (`src/lib/anti-spam`): toda Server Action que cree algo sin cuenta empieza con `guardAction("accion", input)`, que comprueba el **campo trampa** y el **límite por IP** (ventana fija en la tabla `action_limits`, una sentencia atómica). Los límites están en `RATE_LIMITS` (`limits.ts`). Los formularios usan `useHoneypot()` y envían `...honeypot.value()`. La IP nunca se guarda en claro (HMAC con `BETTER_AUTH_SECRET`) y el cron borra los contadores de más de un día. Solo actúa en producción (`RATE_LIMIT=on` para probarlo en local) y, si la BD falla, deja pasar.
- `npm audit` se revisa en cada actualización de dependencias. A día de hoy los avisos abiertos son de herramientas de desarrollo (`drizzle-kit`, `eslint-config-next`) y no llegan a producción.

---

## 10. Flujo de trabajo con Git

- `main` = producción. Cada push a `main` despliega en Vercel. Nadie hace push directo a `main` (activar protección de rama en GitHub).
- Ramas cortas desde `main`: `feat/publicar-form`, `fix/mapa-ios`, `chore/deps`, `docs/guidelines`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `ci:`. Descripción en español, imperativo, ≤ 72 caracteres.
  - `feat: añadir subida de foto con compresión en cliente`
  - `fix: enmascarar teléfono en la tarjeta del listado`
- Cada rama abre un **Pull Request** (aunque trabajes solo): Vercel genera una _preview_ y la CI de GitHub ejecuta los checks. Se fusiona con **squash merge** cuando la CI está en verde y se ha probado la preview en el móvil.
- Un PR = un cambio con sentido. Si el título necesita un "y", probablemente son dos PRs.

---

## 11. Tests

- `npm test` (Vitest) para lógica pura: validaciones, mappers de privacidad, utilidades geo/teléfono. **Las reglas de privacidad de §8 deben tener test.**
- Lo que toca BD se prueba contra Postgres de verdad (el de desarrollo o el de la CI), no con mocks del ORM.
- E2E (fase 2, Playwright): los flujos críticos "publicar → aparece en el listado → marcar como reunido" y "publicar sin capturar → añadir avistamientos → pasar a protectora".
- Antes de abrir un PR: `npm run check` (lint + typecheck + formato + tests).

---

## 12. Despliegue en Vercel

Configuración inicial (una sola vez):

1. Subir el repo a GitHub e importarlo en Vercel (framework detectado: Next.js).
2. En el proyecto de Vercel → **Storage**: añadir **Supabase** y **Blob**.
   - Supabase: crear el proyecto en la región **Frankfurt (eu-central-1)**. La integración añade `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_URL`, etc.
   - Blob: añade `BLOB_READ_WRITE_TOKEN`.
   - Recomendado: en Supabase → _Database Settings → SSL Configuration_, descargar el certificado y pegarlo en la variable `DATABASE_CA_CERT` de Vercel.
   - Las previews usan por defecto la misma BD que producción. Para aislarlas, crea un segundo proyecto de Supabase y pon sus `POSTGRES_URL*` en el entorno _Preview_ de Vercel.
3. Añadir en Environment Variables (Production y Preview): `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (cadena aleatoria de 16+ caracteres; Vercel la envía al cron), `BETTER_AUTH_SECRET` (32+ caracteres) y las de Resend, Google y Apple (ver «Cuentas» en el README).
4. En local: `npx vercel link` y `npx vercel env pull .env.local`.
5. Aplicar migraciones: `npm run db:migrate`.
6. Cargar protectoras: `npm run db:seed:shelters` y revisar en el mapa los enlaces que imprime.
7. Comprobar `GET /api/health` → `{"status":"ok","db":"ok"}`.

El cron diario de caducidad está declarado en `vercel.json` (4:00 UTC).

Día a día: PR → preview automática → merge → producción automática. Las migraciones se aplican manualmente (paso 5) **antes** de fusionar un PR que las necesite.

> Plan Hobby de Vercel = uso personal/no comercial. Si el proyecto se monetiza o se hace con una entidad, pasar a Pro.
>
> Supabase gratuito pausa los proyectos que pasan una semana sin actividad. El cron diario consulta la BD cada día, lo que debería mantenerlo activo; compruébalo en el panel de Supabase las primeras semanas.

---

## 13. Logs

Todo lo que pasa en el servidor y los errores del navegador se registran con el logger de `src/lib/logger`. Detalle, configuración y **catálogo de eventos** en [LOGGING.md](./LOGGING.md).

- **Nunca `console.*`**: ESLint lo prohíbe fuera de `src/lib/logger`. Usa `createLogger("modulo")`.
- **Server Actions** siempre dentro de `runAction(...)`. Route handlers y crons, con `withLogContext` + `log.time`.
- **Eventos con nombre `dominio.accion`** (`post.created`, `sighting.rejected`) y datos estructurados, no frases.
- **Niveles**: `info` = algo de negocio que ha ido bien; `warn` = rechazado o sospechoso pero controlado; `error` = alguien debería mirarlo; `debug` = solo desarrollo.
- **Sin datos personales**: solo IDs, enums, contadores y duraciones. Nada de teléfonos, emails, nombres, textos libres ni coordenadas. El logger los tapa por si acaso, pero no los pases.
- **Errores como tercer argumento**: `log.error("x.failed", { postId }, error)`.
- **Cada evento nuevo se añade al catálogo de LOGGING.md en el mismo PR.**

---

## 14. Definición de "hecho"

Una tarea está terminada cuando:

- [ ] `npm run check` pasa en local y la CI está en verde.
- [ ] Funciona en la preview de Vercel, probado en un móvil real.
- [ ] Tiene estados de carga, vacío y error.
- [ ] Respeta las reglas de privacidad (§8); si toca datos personales, tiene test.
- [ ] Es accesible con teclado y tiene textos alternativos.
- [ ] Si cambia el esquema, incluye la migración.
- [ ] Las acciones nuevas usan `runAction` y sus eventos están en el catálogo de LOGGING.md.
- [ ] Si cambia una decisión de esta guía, la guía está actualizada en el mismo PR.
