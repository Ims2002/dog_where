# Arquitectura — DogWhere

## Visión general

Todo el servicio vive en Vercel: la app Next.js se despliega como funciones serverless y los servicios de datos se contratan desde el **Vercel Marketplace / Storage**, de modo que facturación, variables de entorno y previews se gestionan desde un único panel.

```
                ┌──────────────────────────── Vercel (fra1) ────────────────────────────┐
  Navegador     │                                                                        │
  (móvil)  ───► │  Next.js 16 App Router                                                 │
     │          │  ├─ Server Components  (listado, detalle, mapa de protectoras)         │
     │          │  ├─ Server Actions     (publicar, cambiar custodia, avistamiento,      │──► Neon Postgres
     │          │  │                      marcar reunido, denunciar)                     │    (aws-eu-central-1)
     │          │  └─ Route Handlers     (/api/health, /api/cron/expire)                 │
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
├─ id               uuid PK                ├─ author_id        (fase 2)
├─ post_id ─────────► posts.id (cascade)   ├─ expires_at
├─ lat, lng         → ~11 m                └─ created_at, updated_at
├─ seen_at
├─ note, photo_url, photo_pathname         reports
├─ reporter_name                           ├─ id, post_id ──► posts.id (cascade)
└─ created_at                              ├─ reason enum(spam, inappropriate, wrong_info, other)
                                           └─ details, created_at
```

Restricciones `CHECK` en `posts`:

- `custody = 'at_shelter'` ⇔ `shelter_id IS NOT NULL`
- `custody_lat/lng` solo pueden tener valor (ambos) si `custody = 'with_finder'`

Índices: `posts(status, created_at)` para el listado, `posts(found_lat, found_lng)` y `shelters(lat, lng)` para filtrar por _bounding box_, `sightings(post_id, seen_at)` para el reguero. A escala local una caja de coordenadas + Haversine (`distanceKm`) es suficiente; si crece, se activa **PostGIS** en Neon y se migra a `geography(Point)` con índice GiST.

## Decisiones (ADR resumido)

| #   | Decisión                                                | Alternativas consideradas             | Motivo                                                                                                                                                                           |
| --- | ------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Next.js 16 en Vercel**                                | SPA + API separada; Astro             | Un solo despliegue, previews por PR, Server Actions eliminan la capa de API.                                                                                                     |
| 2   | **Neon Postgres vía Marketplace**                       | Supabase; Vercel KV/Redis             | Integración nativa en Vercel (variables inyectadas, ramas de BD por preview). Relacional + PostGIS si hace falta. Supabase duplicaría auth/storage.                              |
| 3   | **Drizzle ORM**                                         | Prisma                                | Ligero, sin motor binario, funciona sobre el driver HTTP de Neon en serverless, SQL explícito en las migraciones.                                                                |
| 4   | **Vercel Blob** para fotos, subidas con Server Action   | Cloudinary; client uploads con token  | Nativo de Vercel y con CDN. Al comprimir antes en el navegador la foto pesa poco, así que pasa por el servidor y toda la validación queda en un sitio.                           |
| 5   | **Sin cuentas en el MVP**; Better Auth en fase 2        | Auth.js v5 (sigue en beta); Clerk     | Publicar y avisar de un avistamiento sin registro maximiza la participación. Better Auth es estable, se integra con Drizzle y no tiene coste por usuario.                        |
| 6   | **Leaflet + OpenStreetMap**, manejado sin react-leaflet | Google Maps; Mapbox; react-leaflet    | Sin API key ni facturación. react-leaflet fallaba al reactivar rutas ocultas por `<Activity>`; un componente imperativo que crea y destruye su propio contenedor es más robusto. |
| 7   | **Fuente Geist autoalojada** (paquete `geist`)          | `next/font/google`                    | El build no depende de la red a Google Fonts.                                                                                                                                    |
| 8   | **Región fra1 + Neon Frankfurt**                        | iad1 (por defecto)                    | Usuarios en España; función y BD en la misma región.                                                                                                                             |
| 9   | **Custodia como campo + `CHECK`**, no tabla aparte      | Tabla `custody_events` con histórico  | Solo importa el estado actual; el histórico de movimiento ya lo da el reguero. Si se necesita auditoría, se añade una tabla de eventos sin romper el modelo.                     |
| 10  | **Protectoras curadas** (`pending → approved`)          | Que cualquiera cree puntos de entrega | Un punto de entrega falso podría usarse para robar animales. Solo se ofrecen lugares verificados.                                                                                |
| 11  | **Avistamientos abiertos a cualquiera**, sin cuenta     | Solo el autor de la publicación       | El valor del reguero depende de que lo alimente el vecindario. Se compensa con límites por publicación y rate limiting.                                                          |
| 12  | **Casa de quien acoge: solo la zona en público**        | Mostrar la ubicación exacta           | Es el domicilio de un particular. La zona (~1 km) basta para que el dueño sepa que es cerca; la dirección se da por contacto directo.                                            |

| 13 | **Driver `pg` fuera de Neon** | Solo Neon (también en local) | Permite desarrollar con un Postgres en Docker y que la CI construya contra un Postgres de servicio. Coste: no usar transacciones interactivas. |
| 14 | **Enlace secreto de gestión** en el MVP | Cuentas desde el principio | Publicar sin registro. El token solo se muestra una vez y en la BD se guarda su hash. |

## Variables de entorno

| Variable                                        | Dónde              | Origen                             |
| ----------------------------------------------- | ------------------ | ---------------------------------- |
| `DATABASE_URL`                                  | Servidor           | Integración Neon                   |
| `BLOB_READ_WRITE_TOKEN`                         | Servidor           | Integración Vercel Blob            |
| `NEXT_PUBLIC_SITE_URL`                          | Cliente + servidor | Manual                             |
| `CRON_SECRET`                                   | Servidor           | Manual (obligatoria en producción) |
| `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET` | Servidor           | Manual (fase 2)                    |

## Coste estimado

Con tráfico local, todo encaja en los niveles gratuitos de Vercel (Hobby), Neon y Vercel Blob. Lo primero que crecería es el almacenamiento de fotos (ahora también las de avistamientos): la compresión a WebP ≤ 1600 px en cliente y el borrado al caducar lo mantienen acotado.
