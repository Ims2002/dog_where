# Arquitectura — DogWhere

## Visión general

Todo el servicio vive en Vercel: la app Next.js se despliega como funciones serverless y los servicios de datos se contratan desde el **Vercel Marketplace / Storage**, de modo que facturación, variables de entorno y previews se gestionan desde un único panel.

```
                ┌──────────────────────────── Vercel (fra1) ────────────────────────────┐
  Navegador     │                                                                        │
  (móvil)  ───► │  Next.js 16 App Router                                                 │
     │          │  ├─ Server Components  (listado, detalle, mapa de protectoras)         │
     │          │  ├─ Server Actions     (publicar, cambiar custodia, avistamiento,      │──► Supabase Postgres
     │          │  │                      marcar reunido, denunciar)                     │    (aws-eu-central-1)
     │          │  ├─ Route Handlers     (/api/health, /api/cron/expire)                 │
     │          │  └─ Better Auth        (/api/auth/*: email, Google, Apple) ─► Gmail/Resend│
     │          └────────────────────────────────────────────────────────────────────────┘
     │          │       │ uploadPhoto (Server Action) ─────────────────────────────────────┼──► Vercel Blob
     └──────────┴───────┘
```

## Conceptos del dominio

- **Publicación (`posts`)**: un animal extraviado que alguien ha encontrado. Tiene foto, información, lugar del hallazgo y, opcionalmente, los datos de su chapa.
- **Custodia**: dónde está el animal ahora.
  - `with_finder` — en casa de quien lo encontró; puede adjuntar la ubicación (en público solo se ve la zona).
  - `at_shelter` — lo ha dejado en una **protectora** dada de alta.
  - `not_caught` — no se ha podido atrapar; se va construyendo un **reguero** de avistamientos.
- **Protectora (`shelters`)**: perrera municipal, protectora o veterinario colaborador, dado de alta como punto de referencia donde dejar animales. Pasa por `pending → approved`.
- **Avistamiento (`sightings`)**: un punto + hora (y opcionalmente nota y foto) donde se ha visto a un animal sin capturar. Lo puede añadir cualquiera.

```
not_caught ──(alguien lo atrapa)──► with_finder ──(lo lleva a la protectora)──► at_shelter
     │                                   │                                          │
     └───────────────────────────────────┴────────(el dueño lo recupera)────────────┴──► status = reunited
```

## Flujos principales

**1. Publicar un animal encontrado**

1. El usuario abre `/publicar`. Un aviso le recuerda llamar al teléfono de la chapa o a la Policía Local (092) para leer el microchip antes de publicar. Hace o elige una foto: el navegador la redimensiona y re-codifica a WebP (elimina EXIF/GPS) y la Server Action `uploadPhoto` la guarda en Vercel Blob.
2. Datos del animal: especie, descripción, ¿lleva chapa? (texto + teléfono).
3. Lugar del hallazgo: geolocalización del navegador o pin en el mapa, y localidad.
4. **¿Dónde está ahora?**
   - _Me lo quedo en casa_ → opcionalmente marca la ubicación de la casa.
   - _Lo dejo en una protectora_ → se muestran las protectoras aprobadas más cercanas (`NEARBY_SHELTERS_RADIUS_KM`) en lista y mapa, con dirección y horario; elige una.
   - _No lo he podido atrapar_ → la publicación arranca su reguero en el lugar del hallazgo.
5. Nombre y forma de contacto de quien publica.
6. Server Action `createPost` → valida con `createPostSchema` (unión discriminada por `custody`) → inserta con `expiresAt = now + 60 días` → `revalidateTag("posts")`.

**2. Reguero de avistamientos (animal sin capturar)**

1. En el detalle de una publicación `not_caught`, el botón _"Lo he visto"_ abre un mapa centrado en la ubicación actual del usuario.
2. Marca el punto, la hora (por defecto, ahora) y opcionalmente una nota o foto.
3. Server Action `createSighting` → valida con `createSightingSchema`, comprueba que la publicación sigue `active` y `not_caught`, y el límite `MAX_SIGHTINGS_PER_POST` → `revalidateTag("post:<id>")`.
4. El mapa del detalle dibuja el reguero con `buildTrail`: lugar del hallazgo → avistamientos en orden cronológico, con los de más de `SIGHTING_STALE_HOURS` atenuados. El último punto es la mejor pista.

**3. Cambiar la custodia**

Quien publicó (fase 1: con el enlace secreto de gestión que recibe al publicar; fase 2: desde su cuenta) actualiza la custodia con `updateCustodySchema`, p. ej. al atraparlo o al llevarlo a una protectora. El reguero se conserva como histórico.

**4. Buscar a mi mascota**

1. `/` muestra las publicaciones activas cercanas (geolocalización opcional; si no, las más recientes de la zona).
2. Filtros: especie, custodia, radio, fecha.
3. Detalle `/mascota/[id]`: foto, chapa con teléfono enmascarado, lugar aproximado del hallazgo, dónde está ahora (zona / protectora con dirección / reguero), contacto de quien lo encontró.

**5. Protectoras**

- `/protectoras`: mapa y listado público de las aprobadas.
- Alta (MVP): la hace un administrador (seed o script con `createShelterSchema`). Fase 2: formulario público de solicitud que crea la protectora en `pending` y panel de moderación para aprobarla.

**6. Reencuentro y caducidad**

- Marcar como `reunited`: se muestra un tiempo con un distintivo y después se archiva.
- Vercel Cron diario: archiva publicaciones con `expiresAt < now`, borra datos de chapa y ubicación de la casa, y elimina los blobs (publicación y avistamientos).

## Modelo de datos

```
shelters                                   posts
├─ id               uuid PK                ├─ id               uuid PK
├─ kind             enum(pound,            ├─ species          enum(dog, cat, other)
│                        shelter, vet)     ├─ status           enum(active, reunited, archived)
├─ status           enum(pending,          ├─ description      text
│                   approved, disabled)    ├─ photo_url / photo_pathname
├─ name, address, locality                 ├─ has_tag, tag_text
├─ lat, lng         (públicos)             ├─ tag_phone        PRIVADO → enmascarado
├─ phone, email, website                   ├─ found_lat/lng    PRIVADO → ~100 m
├─ opening_hours                           ├─ locality, seen_at
├─ accepts_drop_off boolean                ├─ custody          enum(with_finder, at_shelter, not_caught)
└─ created_at, updated_at                  ├─ shelter_id ──────► shelters.id   (solo si at_shelter)
                                           ├─ custody_lat/lng  PRIVADO → ~1 km (solo si with_finder)
sightings                                  ├─ finder_name, finder_contact
├─ id               uuid PK                ├─ author_id ───────► users.id (set null; opcional)
├─ post_id ─────────► posts.id (cascade)   ├─ expires_at
├─ lat, lng         → ~11 m                └─ created_at, updated_at
├─ seen_at
├─ note, photo_url, photo_pathname         reports
├─ reporter_name                           ├─ id, post_id ──► posts.id (cascade)
└─ created_at                              ├─ reason enum(spam, inappropriate, wrong_info, other)
                                           └─ details, created_at
```

Cuentas (tablas de Better Auth, ids de texto que genera la librería):

```
users                          sessions                       accounts
├─ id            text PK       ├─ id, token (único)           ├─ id
├─ name, email (único)         ├─ user_id ──► users (cascade) ├─ user_id ──► users (cascade)
├─ email_verified, image       ├─ expires_at                  ├─ provider_id  credential | google | apple
└─ created_at, updated_at      └─ ip_address, user_agent      ├─ account_id   (id en el proveedor)
                                                              ├─ password     (hash scrypt, solo credential)
verifications (tokens de email y de contraseña)               └─ access/refresh/id tokens del proveedor
rate_limits   (contador por IP y ruta de /api/auth)
action_limits (contador anti-spam: acción + IP cifrada, ventana de 1 h; el cron borra lo de >1 día)
```

Al borrar un usuario se borran antes sus publicaciones (con fotos y avistamientos) y después, en cascada, sus sesiones y cuentas.

Restricciones `CHECK` en `posts`:

- `custody = 'at_shelter'` ⇔ `shelter_id IS NOT NULL`
- `custody_lat/lng` solo pueden tener valor (ambos) si `custody = 'with_finder'`

Índices: `posts(status, created_at)` para el listado, `posts(found_lat, found_lng)` y `shelters(lat, lng)` para filtrar por _bounding box_, `sightings(post_id, seen_at)` para el reguero. A escala local una caja de coordenadas + Haversine (`distanceKm`) es suficiente; si crece, se activa **PostGIS** en Supabase y se migra a `geography(Point)` con índice GiST.

## Decisiones (ADR resumido)

| #   | Decisión                                                | Alternativas consideradas                        | Motivo                                                                                                                                                                           |
| --- | ------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Next.js 16 en Vercel**                                | SPA + API separada; Astro                        | Un solo despliegue, previews por PR, Server Actions eliminan la capa de API.                                                                                                     |
| 2   | **Supabase (solo su Postgres) vía Marketplace**         | Neon; PocketBase                                 | Ya conocido, panel cómodo para ver y editar datos, integración con Vercel que inyecta las variables. PocketBase necesita un servidor siempre encendido y no encaja en Vercel.    |
| 3   | **Drizzle ORM + `pg`** (sin el SDK de Supabase)         | Prisma; supabase-js                              | Ligero, sin motor binario, SQL explícito en las migraciones y tipos desde el esquema. Toda la lógica en el servidor; no dependemos de la API REST de Supabase.                   |
| 4   | **Vercel Blob** para fotos, subidas con Server Action   | Cloudinary; client uploads con token             | Nativo de Vercel y con CDN. Al comprimir antes en el navegador la foto pesa poco, así que pasa por el servidor y toda la validación queda en un sitio.                           |
| 5   | **Better Auth** para cuentas (opcionales)               | Auth.js v5 (sigue en beta); Clerk; Supabase Auth | Estable, se integra con Drizzle y nuestras tablas, sin coste por usuario ni otro servicio. Las cuentas son opcionales: publicar y avisar de un avistamiento sigue sin registro.  |
| 6   | **Leaflet + OpenStreetMap**, manejado sin react-leaflet | Google Maps; Mapbox; react-leaflet               | Sin API key ni facturación. react-leaflet fallaba al reactivar rutas ocultas por `<Activity>`; un componente imperativo que crea y destruye su propio contenedor es más robusto. |
| 7   | **Fuente Archivo autoalojada** (`next/font/local`)      | `next/font/google`                               | El build no depende de la red a Google Fonts. Su eje de anchura da los titulares estrechos de cartel.                                                                            |
| 8   | **Región fra1 + Supabase Frankfurt**                    | iad1 (por defecto)                               | Usuarios en España; función y BD en la misma región.                                                                                                                             |
| 9   | **Custodia como campo + `CHECK`**, no tabla aparte      | Tabla `custody_events` con histórico             | Solo importa el estado actual; el histórico de movimiento ya lo da el reguero. Si se necesita auditoría, se añade una tabla de eventos sin romper el modelo.                     |
| 10  | **Protectoras curadas** (`pending → approved`)          | Que cualquiera cree puntos de entrega            | Un punto de entrega falso podría usarse para robar animales. Solo se ofrecen lugares verificados.                                                                                |
| 11  | **Avistamientos abiertos a cualquiera**, sin cuenta     | Solo el autor de la publicación                  | El valor del reguero depende de que lo alimente el vecindario. Se compensa con límites por publicación y rate limiting.                                                          |
| 12  | **Casa de quien acoge: solo la zona en público**        | Mostrar la ubicación exacta                      | Es el domicilio de un particular. La zona (~1 km) basta para que el dueño sepa que es cerca; la dirección se da por contacto directo.                                            |
| 13  | **RLS activado sin políticas** en todas las tablas      | Desactivar la API REST de Supabase               | La clave _publishable_ es pública y la API REST expone el esquema `public`. Con RLS sin políticas no ve nada; la app es propietaria de las tablas y no le afecta.                |
| 14  | **Enlace secreto de gestión** en el MVP                 | Cuentas desde el principio                       | Publicar sin registro. El token solo se muestra una vez y en la BD se guarda su hash.                                                                                            |

## Observabilidad

Logs estructurados propios (`src/lib/logger`) en JSON hacia stdout/stderr, que Vercel recoge en **Logs** y puede reenviar con un Log Drain. Cada petición lleva un `requestId` que se propaga con `AsyncLocalStorage`. `instrumentation.ts` captura los errores no controlados del servidor y `instrumentation-client.ts` los del navegador. Detalle en [LOGGING.md](./LOGGING.md).

| #   | Decisión                                          | Alternativas                      | Motivo                                                                                                                                                                                |
| --- | ------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | **Logger propio** (≈150 líneas, sin dependencias) | pino; Sentry; OpenTelemetry       | pino usa workers para sus transportes y encaja mal en serverless; Sentry/OTel son útiles más adelante. Con JSON + Vercel Logs basta para empezar, y cambiar el _sink_ no toca la app. |
| 16  | **Redacción automática** de datos personales      | Confiar en que nadie los registre | RGPD: los logs salen de la BD y pueden ir a terceros. Red de seguridad por clave y por patrón (emails, teléfonos, parámetros SQL, tokens en rutas).                                   |

### Cuentas

| #   | Decisión                                                             | Alternativas                       | Motivo                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | **Email + contraseña con verificación**, Google y Apple              | Enlace mágico; solo redes sociales | Lo más familiar para cualquiera. La verificación evita cuentas con emails ajenos y permite vincular Google/Apple con seguridad al mismo usuario.                                                                                 |
| 18  | **Botones sociales solo si hay credenciales**                        | Flags de configuración aparte      | Apple queda "listo pero oculto" hasta tener la cuenta de desarrollador: basta con añadir sus 4 variables. El client secret de Apple se firma solo (ES256).                                                                       |
| 19  | **Emails por Gmail (SMTP) o Resend**, lo que esté configurado        | Solo Resend; Postmark              | Gmail con contraseña de aplicación funciona sin dominio propio (≈500/día); Resend, con dominio, escala mejor. El transporte se elige por variables (`emailTransport()`). Sin ninguno, en local los enlaces salen en la terminal. |
| 20  | **Sesión en BD + cookie de caché (5 min)**                           | JWT sin estado                     | Se pueden revocar (cambio de contraseña, borrado). La cookie firmada evita una consulta por página.                                                                                                                              |
| 21  | **El autor gestiona desde su cuenta**, el enlace secreto se mantiene | Quitar el enlace si hay cuenta     | Quien publica sin cuenta no pierde nada; quien tiene cuenta no depende de guardar el enlace.                                                                                                                                     |
| 22  | **Borrar la cuenta borra sus publicaciones**                         | Anonimizarlas                      | Llevan su nombre y su contacto. RGPD: supresión real.                                                                                                                                                                            |
| 23  | **Rate limit de Better Auth en la BD** (`rate_limits`)               | Memoria; Upstash                   | En serverless la memoria no se comparte entre instancias. Sin otro servicio. Por IP: login 15 cada 5 min, registro 15/h, recuperar contraseña y reenviar confirmación 8/h.                                                       |
| 24  | **Anti-spam propio en Postgres** (`action_limits`) + campo trampa    | Upstash Redis; CAPTCHA             | Sin otro servicio ni cuenta. Una sentencia `insert … on conflict` atómica basta para el volumen local. Sin CAPTCHA: molesta a vecinos con prisa y el campo trampa frena a los bots simples.                                      |

## Variables de entorno

| Variable                                     | Dónde              | Origen                                              |
| -------------------------------------------- | ------------------ | --------------------------------------------------- |
| `POSTGRES_URL`                               | Servidor           | Integración Supabase (pooler, transacción)          |
| `POSTGRES_URL_NON_POOLING`                   | Migraciones        | Integración Supabase                                |
| `DATABASE_CA_CERT`                           | Servidor           | Manual (recomendada): CA de Supabase                |
| `DATABASE_URL`                               | Local / CI         | Alternativa a `POSTGRES_URL` con un Postgres propio |
| `BLOB_READ_WRITE_TOKEN`                      | Servidor           | Integración Vercel Blob                             |
| `NEXT_PUBLIC_SITE_URL`                       | Cliente + servidor | Manual                                              |
| `LOG_LEVEL`, `LOG_FORMAT`, `LOG_DB_QUERIES`  | Servidor           | Opcionales (ver LOGGING.md)                         |
| `CRON_SECRET`                                | Servidor           | Manual (obligatoria en producción)                  |
| `BETTER_AUTH_SECRET`                         | Servidor           | Manual (obligatoria en producción, 32+ caracteres)  |
| `BETTER_AUTH_URL`                            | Servidor           | Opcional (por defecto `NEXT_PUBLIC_SITE_URL`)       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | Servidor           | Google Cloud Console (opcional: activa el botón)    |
| `APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY` | Servidor           | Apple Developer (opcional: activa el botón)         |
| `RESEND_API_KEY`, `EMAIL_FROM`               | Servidor           | Resend (obligatoria en producción para los emails)  |

## Coste estimado

Con tráfico local, todo encaja en los niveles gratuitos de Vercel (Hobby), Supabase y Vercel Blob. Lo primero que crecería es el almacenamiento de fotos (ahora también las de avistamientos): la compresión a WebP ≤ 1600 px en cliente y el borrado al caducar lo mantienen acotado.
