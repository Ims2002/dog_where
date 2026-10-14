@AGENTS.md

# DogWhere — contexto para agentes

App para que quien encuentra un animal extraviado publique foto, información y ubicación (con datos de su chapa) y su dueño lo recupere. Cada publicación tiene una **custodia**: `with_finder` (en casa de quien lo encontró), `at_shelter` (en una protectora dada de alta) o `not_caught` (sin capturar, con un reguero de avistamientos). Next.js 16 en Vercel + Neon Postgres (Drizzle) + Vercel Blob.

**Antes de escribir código lee `docs/GUIDELINES.md`.** Arquitectura y decisiones en `docs/ARCHITECTURE.md`; tareas pendientes en `docs/ROADMAP.md`.

## Comandos

```bash
npm run dev          # servidor local (http://localhost:3000)
npm run check        # lint + typecheck + formato + tests  ← antes de cada PR
npm test             # Vitest
npm run db:generate  # generar migración tras cambiar src/lib/db/schema.ts
npm run db:migrate   # aplicar migraciones
```

## Reglas clave (resumen de la guía)

- Código en inglés; UI, comentarios y docs en español. Archivos en kebab-case.
- Server Components por defecto; `"use client"` solo en hojas.
- BD solo desde `src/features/*/queries.ts` y `actions.ts` (con `server-only`). Nunca `getDb()` en componentes.
- Server Actions: validar con Zod en servidor y devolver `ActionResult`, no lanzar para errores esperados.
- **Privacidad:** nunca enviar filas crudas al cliente; usar los mappers (`toPublicPost`, `toPublicSighting`, `toPublicShelter`). Teléfono de chapa enmascarado; hallazgo ~100 m, casa de quien acoge ~1 km, avistamientos ~11 m (`PUBLIC_DECIMALS`). Cualquier cambio en datos personales lleva test.
- Solo protectoras `approved` se pueden elegir; avistamientos solo en publicaciones `active` + `not_caught`.
- Cache Components activo: datos dinámicos por defecto; `"use cache"` + `cacheLife` + `cacheTag`, y `revalidateTag` tras mutar.
- Conventional Commits (`feat: …` con descripción en español).
