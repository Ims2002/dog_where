# Roadmap — DogWhere

## Fase 0 — Setup ✅

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Drizzle + Postgres: esquema `posts` (con custodia), `shelters`, `sightings`, `reports` y migración inicial
- [x] Validación (publicación, cambio de custodia, avistamiento, alta de protectora) y utilidades de privacidad con tests
- [x] Guía de desarrollo, arquitectura, CI en GitHub Actions
- [ ] Crear repo en GitHub y conectar a Vercel
- [ ] Añadir Supabase y Blob desde Vercel Storage; `vercel env pull`; `npm run db:migrate`
- [ ] `/api/health` en verde en producción

## Fase 1 — MVP ✅ (código)

**Base**

- [x] Componentes UI base (`Button`, `Field`, `Input`, `Select`, `CustodyBadge`) y dirección visual "cartel de farola"
- [x] Mapa (Leaflet + OSM): selector de ubicación, marcadores, zonas y polilínea
- [x] Foto: compresión en el navegador (sin EXIF) + Server Action `uploadPhoto`
- [x] BD en Supabase vía `pg` (pooler, SSL) con RLS activado en todas las tablas

**Protectoras**

- [x] `data/shelters.json` con las 6 protectoras de la zona + `npm run db:seed:shelters` (geocodifica con Nominatim)
- [x] `/protectoras`: mapa y listado de las aprobadas
- [x] Al publicar, protectoras ordenadas por cercanía al lugar del hallazgo

**Publicaciones**

- [x] `/publicar`: aviso de chapa/Policía Local → foto → animal y chapa → dónde y cuándo → ¿dónde está ahora? → contacto
- [x] Server Action `createPost` + enlace secreto de gestión (token con hash)
- [x] `/`: listado de activas, filtros por animal y custodia, "Cerca de mí" con radio
- [x] `/mascota/[id]`: detalle con lugar aproximado, custodia (zona / protectora / reguero), contacto y compartir
- [x] `/gestionar/[id]/[token]`: cambiar custodia, marcar como reunido, borrar

**Reguero de avistamientos**

- [x] "Lo he visto" en publicaciones `not_caught` + Server Action `createSighting`
- [x] Mapa del reguero con `buildTrail` (último punto destacado, antiguos atenuados)
- [x] Compartir por WhatsApp (Open Graph con la foto)

**Operación y legal**

- [x] Denunciar publicación
- [x] Cron diario de caducidad (archivar + borrar datos privados, fotos y avistamientos)
- [x] Borradores de aviso legal y privacidad; Vercel Web Analytics (sin cookies)

**Pendiente de la Fase 1**

- [ ] Filtro por fecha en el listado
- [ ] og-image propia con el último avistamiento del reguero

## Antes del lanzamiento

- [ ] Conectar el repo a Vercel, añadir Supabase y Blob, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` y `DATABASE_CA_CERT`
- [ ] `npm run db:migrate` y `npm run db:seed:shelters` contra producción
- [ ] Revisar en el mapa la ubicación de cada protectora (las "Partida …" pueden geocodificar de forma aproximada)
- [ ] Llamar a cada protectora para confirmar si acepta animales encontrados (`acceptsDropOff`) y cómo
- [ ] Els Poets: conseguir la dirección del refugio y aprobarla
- [ ] Completar titular, NIF y contacto en Privacidad y Aviso legal y revisarlos
- [ ] Probar el flujo completo desde un móvil real con la preview de Vercel

## Fase 2 — Comunidad y anti-abuso

- [ ] Cuentas (Google + enlace mágico por email): Supabase Auth o Better Auth, a decidir
- [ ] Rate limiting (Upstash Redis) + honeypot en publicaciones, avistamientos y denuncias
- [ ] Formulario público de solicitud de alta de protectoras + panel de moderación
- [ ] Alertas por zona (email) cuando se publica un animal cerca o hay un avistamiento nuevo en un reguero que sigues
- [ ] Tests e2e con Playwright de los flujos críticos

## Fase 3 — Ideas

- [ ] Panel para protectoras: ver y gestionar los animales que se les han dejado
- [ ] Publicaciones de "se busca" por parte de dueños
- [ ] **Matching por similitud de imagen** entre "se busca" y "encontrado" (embeddings de imagen + `pgvector` en Supabase)
- [ ] Predicción de la zona probable del animal a partir del reguero (dirección y velocidad de los avistamientos)
- [ ] PWA instalable con notificaciones push
