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
4. **Barato de operar.** Todo cabe en los planes gratuitos de Vercel + Neon + Vercel Blob mientras el tráfico sea local.

Fuera de alcance del MVP: chat interno, pagos, app nativa, publicaciones de "se busca" por parte de dueños (está en el roadmap), panel propio para protectoras (en el MVP las da de alta un administrador).

---

## 2. Stack

| Capa          | Elección                                      | Notas                                                               |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Framework     | **Next.js 16** (App Router, Cache Components) | Server Components por defecto. Turbopack.                           |
| Lenguaje      | **TypeScript** `strict`                       | Prohibido `any` explícito; usa `unknown` y estrecha.                |
| Estilos       | **Tailwind CSS v4**                           | Tokens en `src/app/globals.css` (`@theme`).                         |
| Base de datos | **Postgres en Neon** (vía Vercel Marketplace) | Cliente HTTP serverless `@neondatabase/serverless`.                 |
| ORM           | **Drizzle ORM** + drizzle-kit                 | Esquema en `src/lib/db/schema.ts`, migraciones en `drizzle/`.       |
| Ficheros      | **Vercel Blob**                               | Subida directa desde el cliente (client uploads).                   |
| Validación    | **Zod 4**                                     | Mismo esquema en cliente (UX) y servidor (seguridad).               |
| Tests         | **Vitest**                                    | Playwright para e2e en fase 2.                                      |
| Calidad       | ESLint (config de Next) + Prettier            | `npm run check` lo ejecuta todo.                                    |
| Hosting       | **Vercel**, región `fra1`                     | Misma región que Neon (`aws-eu-central-1`) para minimizar latencia. |

Auth (Better Auth), mapas (Leaflet + OpenStreetMap) y rate limiting (Upstash) se añaden en sus fases; la justificación está en ARCHITECTURE.md.

> **Next.js 16 no es el Next.js "de siempre".** Antes de usar una API de Next, consulta la doc que viene en `node_modules/next/dist/docs/`. Especialmente: Cache Components (`"use cache"`, `cacheLife`, `cacheTag`) y `connection()`.

---

## 3. Estructura de carpetas

```
dog_where/
├── docs/                    # Guía, arquitectura, roadmap
├── drizzle/                 # Migraciones SQL generadas (se commitean)
├── public/                  # Estáticos (iconos, og-image)
└── src/
    ├── app/                 # SOLO rutas: page, layout, loading, error, route handlers
    │   └── api/health/      # GET /api/health
    ├── components/
    │   └── ui/              # Primitivas genéricas (Button, Input, Card…) sin lógica de negocio
    ├── features/            # Un directorio por dominio
    │   ├── posts/           # Publicaciones y su custodia
    │   │   ├── constants.ts     # Enums, límites, precisión pública, etiquetas de UI
    │   │   ├── validation.ts    # Esquemas Zod (compartidos cliente/servidor)
    │   │   ├── queries.ts       # Lecturas de BD   ("server-only")
    │   │   ├── actions.ts       # Server Actions   ("use server")
    │   │   ├── mappers.ts       # Post de BD → DTO público (aplica reglas de privacidad)
    │   │   └── components/      # Componentes propios del dominio
    │   ├── shelters/        # Protectoras, perreras y veterinarios (puntos de referencia)
    │   └── sightings/       # Reguero de avistamientos de animales sin capturar
    └── lib/                 # Utilidades transversales (db, env, geo, phone, validation)
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
- **Mutaciones con Server Actions** (`features/*/actions.ts`). Los Route Handlers (`app/api/*`) se reservan para: health check, el endpoint de tokens de Vercel Blob, webhooks y cron.
- **El acceso a BD vive solo en `queries.ts` y `actions.ts`**, que importan `server-only`. Ningún componente llama a `getDb()` directamente.
- **Caching (Cache Components):** los datos son dinámicos por defecto.
  - Lecturas que pueden cachearse (listado público, detalle) → `"use cache"` + `cacheLife(...)` + `cacheTag("posts")`.
  - Tras una mutación → `revalidateTag("posts")` (o el tag concreto, `post:<id>`).
  - Todo lo que sea dinámico y no cacheado va dentro de un `<Suspense>` con fallback.
- Cada ruta con datos tiene su `loading.tsx` y su `error.tsx`.

### Server Actions: contrato

Toda Server Action:

1. Valida la entrada con Zod en el servidor (aunque el cliente ya lo haya hecho).
2. Comprueba permisos (en cuanto exista auth).
3. Devuelve un resultado tipado; **no lanza excepciones para errores esperados**:

```ts
type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Las excepciones se reservan para lo inesperado (BD caída), que acaba en `error.tsx`.

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
  3. `npm run db:migrate` contra tu rama de desarrollo de Neon.
  4. Commitea el SQL junto al cambio de esquema, en el mismo PR.
  5. Nunca `drizzle-kit push` contra producción. Nunca editar una migración ya aplicada en producción.
- Usa ramas de Neon (database branching) para desarrollo y previews; producción no se toca a mano.

---

## 7. Fotos (Vercel Blob)

- Tipos permitidos: JPEG, PNG, WebP. Máximo 5 MB (`MAX_PHOTO_BYTES`).
- **Antes de subir**, el cliente redimensiona (lado mayor ≤ 1600 px) y re-codifica a WebP con `<canvas>`. Esto reduce peso y **elimina los metadatos EXIF, incluida la ubicación GPS** de la foto.
- La subida es directa del navegador a Blob (`@vercel/blob/client` + route handler que emite el token). El token restringe tipo y tamaño en servidor también.
- El servidor solo acepta `photoUrl` de `*.public.blob.vercel-storage.com` (ya validado en `createPostSchema`).
- Al borrar o caducar una publicación se borra también su blob (`photoPathname`).

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

---

## 9. Seguridad

- Secretos solo en variables de entorno de Vercel y en `.env.local` (ignorado por git). `.env.example` documenta todas las variables, sin valores.
- Las variables de servidor se leen con `getServerEnv()` (validadas con Zod). Solo lo prefijado con `NEXT_PUBLIC_` llega al navegador.
- Toda entrada de usuario se valida en el servidor. Nada de `dangerouslySetInnerHTML` con contenido de usuario.
- Cabeceras de seguridad definidas en `next.config.ts` (`nosniff`, `X-Frame-Options`, `Permissions-Policy` limitada a cámara y geolocalización).
- Los avistamientos se pueden añadir sin cuenta, así que son lo más expuesto a spam: límite de `MAX_SIGHTINGS_PER_POST` por publicación desde el MVP, y solo se aceptan en publicaciones `active` con custodia `not_caught`.
- Las protectoras se crean en estado `pending` y solo un administrador las pasa a `approved`. Nunca se puede elegir una protectora no aprobada.
- Anti-abuso (fase 2): rate limiting por IP en la creación de publicaciones, avistamientos y denuncias (Upstash Redis), y un honeypot en los formularios.
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
- Lo que toca BD se prueba contra una rama de Neon, no con mocks del ORM.
- E2E (fase 2, Playwright): los flujos críticos "publicar → aparece en el listado → marcar como reunido" y "publicar sin capturar → añadir avistamientos → pasar a protectora".
- Antes de abrir un PR: `npm run check` (lint + typecheck + formato + tests).

---

## 12. Despliegue en Vercel

Configuración inicial (una sola vez):

1. Subir el repo a GitHub e importarlo en Vercel (framework detectado: Next.js).
2. En el proyecto de Vercel → **Storage**: añadir **Neon** (Postgres) y **Blob**. Ambos inyectan sus variables (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`) automáticamente.
   - En Neon, elegir región `aws-eu-central-1` (Frankfurt) y activar ramas de BD para _preview deployments_.
3. Añadir `NEXT_PUBLIC_SITE_URL` en Environment Variables (Production y Preview).
4. En local: `npx vercel link` y `npx vercel env pull .env.local`.
5. Aplicar migraciones: `npm run db:migrate`.
6. Comprobar `GET /api/health` → `{"status":"ok","db":"ok"}`.

Día a día: PR → preview automática → merge → producción automática. Las migraciones se aplican manualmente (paso 5) **antes** de fusionar un PR que las necesite.

> Plan Hobby de Vercel = uso personal/no comercial. Si el proyecto se monetiza o se hace con una entidad, pasar a Pro.

---

## 13. Definición de "hecho"

Una tarea está terminada cuando:

- [ ] `npm run check` pasa en local y la CI está en verde.
- [ ] Funciona en la preview de Vercel, probado en un móvil real.
- [ ] Tiene estados de carga, vacío y error.
- [ ] Respeta las reglas de privacidad (§8); si toca datos personales, tiene test.
- [ ] Es accesible con teclado y tiene textos alternativos.
- [ ] Si cambia el esquema, incluye la migración.
- [ ] Si cambia una decisión de esta guía, la guía está actualizada en el mismo PR.
