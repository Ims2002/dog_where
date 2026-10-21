# Logs — DogWhere

Cómo registra la app lo que pasa, cómo consultarlo y cómo ampliarlo cuando se añadan funcionalidades. Las normas obligatorias están resumidas en [GUIDELINES.md § 13](./GUIDELINES.md#13-logs).

## Cómo funciona

```
Server Action ──runAction()──┐                    ┌─ desarrollo: línea legible y coloreada
Route handler / cron ────────┼─► logger ─► sink ──┤
Render (error no capturado) ─┤   (redacta datos)  └─ producción: 1 línea JSON → Vercel Logs
Navegador ─► /api/log/client ┘
```

- **`src/lib/logger`**: logger estructurado sin dependencias. Cada evento es un objeto con `ts`, `level`, `event`, `module` y los campos que le pases.
- **Contexto por petición**: `runAction()` y `withLogContext()` añaden `requestId` (el `x-vercel-id` de Vercel) y `action` a **todos** los logs que se emiten dentro, aunque estén en otro módulo. Así puedes filtrar una petición entera.
- **Errores no capturados**: `src/instrumentation.ts` (`onRequestError`) registra `request.error` con la plantilla de la ruta (`/mascota/[id]`), su tipo (render, action, route) y el `digest` que ve el usuario en la página de error.
- **Errores del navegador**: `src/instrumentation-client.ts` y los `error.tsx` envían los fallos de JavaScript a `/api/log/client`, que los registra como `client.error`. Como máximo 10 por página y sin repetir.
- **Datos personales**: el logger tapa solo las claves sensibles (`tagPhone`, `finderContact`, `name`, `email`, `lat`, `lng`, `location`, `*Token`, `*Password`, `*Hash`…) y limpia emails, teléfonos, parámetros de consultas SQL, tokens de `/gestionar/…` y `/reset-password/…` y los parámetros `token`, `code` y `state` de las URLs en cualquier texto, incluidos mensajes y trazas de error. Aun así, **no los pases**: esta limpieza es una red de seguridad, no un permiso.

## Niveles

| Nivel   | Cuándo                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `debug` | Detalle para desarrollar (subidas a storage, consultas SQL). No sale en producción por defecto.                                       |
| `info`  | Algo de negocio que ha pasado bien: publicación creada, avistamiento, cron terminado.                                                 |
| `warn`  | Algo rechazado o sospechoso, pero controlado: validación fallida, token de gestión incorrecto, límite alcanzado, error del navegador. |
| `error` | Algo ha fallado y alguien debería mirarlo: excepción, BD caída, fotos que no se han podido borrar.                                    |

## Configuración

| Variable         | Valores                                    | Por defecto                                                         |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `LOG_LEVEL`      | `debug`, `info`, `warn`, `error`, `silent` | `info` en producción, `debug` en desarrollo, `silent` en tests      |
| `LOG_FORMAT`     | `json`, `pretty`                           | `json` en producción, `pretty` en local                             |
| `LOG_DB_QUERIES` | `true`                                     | desactivado (registra cada consulta SQL en `debug`, sin parámetros) |

## Dónde verlos

- **Local**: en la terminal de `npm run dev`.
- **Vercel**: proyecto → **Logs**. Filtros útiles:
  - `level:error` → todo lo que ha fallado.
  - Buscar `"event":"post.created"` → publicaciones nuevas.
  - Buscar el `requestId` de un error → todo lo que pasó en esa petición.
  - Buscar el código que ve el usuario en la página de error (`digest`) → su `request.error`.
- Vercel guarda los logs poco tiempo (depende del plan). Para conservarlos o recibir alertas, se puede añadir un **Log Drain** (Axiom, Better Stack…) en Vercel → Settings → Log Drains sin tocar código: ya salen en JSON.

## Catálogo de eventos

Mantén esta tabla al día: **cada evento nuevo se añade aquí en el mismo PR**.

| Evento                       | Nivel        | Módulo    | Campos                                                                                  | Cuándo                                                                      |
| ---------------------------- | ------------ | --------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `app.start`                  | info         | app       | `region`, `commit`                                                                      | Arranca una instancia del servidor                                          |
| `request.error`              | error        | next      | `route`, `routeType`, `renderSource`, `method`, `err`                                   | Error no capturado en render, action, route o proxy                         |
| `action.done`                | info / warn  | action    | `action`, `outcome` (`ok`/`rejected`), `reason`, `fields`, `durationMs`                 | Termina una Server Action (warn si se rechaza)                              |
| `action.error`               | error        | action    | `action`, `durationMs`, `err`                                                           | Excepción inesperada dentro de una Server Action                            |
| `photo.uploaded`             | info         | posts     | `folder`, `type`, `bytes`                                                               | Foto subida                                                                 |
| `photo.rejected`             | warn         | posts     | `reason` (`type`/`size`), `type`, `bytes`                                               | Foto rechazada por tipo o tamaño                                            |
| `photo.upload_failed`        | error        | posts     | `folder`, `bytes`, `err`                                                                | Fallo al guardar en Blob                                                    |
| `post.created`               | info         | posts     | `postId`, `species`, `custody`, `shelterId`, `hasTag`, `hasHomeLocation`, `withAccount` | Publicación nueva                                                           |
| `post.shelter_unavailable`   | warn         | posts     | `shelterId`                                                                             | Se eligió una protectora no aprobada o inexistente                          |
| `post.custody_updated`       | info         | posts     | `postId`, `from`, `to`                                                                  | Cambio de custodia desde el enlace de gestión                               |
| `post.reunited`              | info         | posts     | `postId`, `custody`                                                                     | Marcada como reunida                                                        |
| `post.deleted`               | info         | posts     | `postId`, `sightingPhotos`                                                              | Borrada desde el enlace de gestión                                          |
| `manage.unauthorized`        | warn         | posts     | `postId`, `reason` (`not_found`/`archived`/`bad_token`/`not_author`)                    | Enlace de gestión no válido, o gestión desde una cuenta que no es la autora |
| `posts.deleted_with_account` | info         | posts     | `count`, `sightingPhotos`                                                               | Publicaciones borradas al borrar una cuenta                                 |
| `report.created`             | info         | posts     | `postId`, `reason`                                                                      | Denuncia recibida                                                           |
| `sighting.created`           | info         | sightings | `postId`, `hasPhoto`, `total`                                                           | Avistamiento nuevo                                                          |
| `sighting.rejected`          | warn         | sightings | `postId`, `reason` (`inactive`/`caught`/`limit`), `total`                               | Avistamiento rechazado                                                      |
| `posts.archived`             | info         | cron      | `archived`, `postIds`, `photosDeleted`                                                  | El cron archiva publicaciones caducadas                                     |
| `posts.expire.none`          | info         | cron      | —                                                                                       | El cron no encontró nada que archivar                                       |
| `cron.expire`                | info         | cron      | `durationMs`                                                                            | Fin del cron de caducidad                                                   |
| `cron.expire.failed`         | error        | cron      | `durationMs`, `err`                                                                     | El cron ha fallado                                                          |
| `cron.unauthorized`          | warn         | cron      | —                                                                                       | Llamada al cron sin `CRON_SECRET`                                           |
| `storage.put`                | debug        | storage   | `backend`, `pathname`, `bytes`                                                          | Foto guardada                                                               |
| `storage.deleted`            | info         | storage   | `count`                                                                                 | Fotos borradas                                                              |
| `storage.delete_failed`      | error        | storage   | `count`, `pathnames`, `err`                                                             | No se pudieron borrar fotos (quedan huérfanas en Blob)                      |
| `db.pool_error`              | error        | db        | `err`                                                                                   | Error en una conexión ociosa del pool                                       |
| `db.query`                   | debug        | db        | `sql`, `paramCount`                                                                     | Cada consulta (solo con `LOG_DB_QUERIES=true`)                              |
| `health.db_error`            | error        | health    | `durationMs`, `err`                                                                     | `/api/health` no llega a la BD                                              |
| `client.error`               | warn         | client    | `source`, `path`, `digest`, `clientError`                                               | Error de JavaScript en el navegador                                         |
| `user.registered`            | info         | auth      | `userId`, `method` (`email`/`google`/`apple`)                                           | Cuenta nueva (con email: aún sin verificar)                                 |
| `auth.email_verified`        | info         | auth      | `userId`                                                                                | Email confirmado                                                            |
| `auth.signed_in`             | info         | auth      | `userId`, `method`                                                                      | Sesión iniciada                                                             |
| `auth.account_linked`        | info         | auth      | `userId`, `provider` (`credential`/`google`/`apple`)                                    | Método de acceso añadido a una cuenta                                       |
| `auth.password_reset`        | info         | auth      | `userId`                                                                                | Contraseña restablecida (se cierran las demás sesiones)                     |
| `user.deleted`               | info         | auth      | `userId`, `posts`                                                                       | Cuenta borrada por su dueño                                                 |
| `auth.library`               | warn / error | auth      | `message`, `err`                                                                        | Aviso o error interno de Better Auth (contraseña incorrecta, fallo de BD…)  |
| `auth.session_failed`        | error        | auth      | `err`                                                                                   | No se pudo leer la sesión en la cabecera (la página sigue sin sesión)       |
| `email.sent`                 | info         | email     | `kind`, `emailId`                                                                       | Email enviado por Resend (nunca el destinatario)                            |
| `email.send_failed`          | error        | email     | `kind`, `code`, `err`                                                                   | Resend ha rechazado o fallado el envío                                      |
| `email.not_configured`       | error        | email     | `kind`                                                                                  | Producción sin `RESEND_API_KEY`: el email no sale                           |
| `email.dev_preview`          | info         | email     | `kind`                                                                                  | Solo local: el enlace se escribe en la terminal                             |

## Cómo añadir logs a una funcionalidad nueva

1. **Logger del módulo**, una vez por archivo:
   ```ts
   import { createLogger } from "@/lib/logger";
   const log = createLogger("alerts");
   ```
2. **Server Actions**: envuelve el cuerpo en `runAction`. Ya tienes `requestId`, duración y resultado sin hacer nada más:
   ```ts
   export async function subscribeToArea(input: SubscribeInput): Promise<ActionResult> {
     return runAction("alert.subscribe", async () => {
       // …
       log.info("alert.subscribed", { areaKm: d.radiusKm });
       return ok(undefined);
     });
   }
   ```
3. **Route handlers y crons**: `withLogContext({ requestId: await currentRequestId(), job: "nombre" }, …)` y `log.time("evento", fn)` para medir.
4. **Eventos**: nombre `dominio.accion` en inglés y en pasado o resultado (`alert.subscribed`, `alert.send_failed`). Solo IDs, enums, contadores y duraciones.
5. **Errores**: siempre como tercer argumento (`log.error("x.failed", { ids }, error)`), nunca dentro de `data` ni como texto.
6. **Añade el evento a la tabla de arriba.**
