# Roadmap — DogWhere

## Fase 0 — Setup ✅

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Drizzle + Neon: esquema `posts` (con custodia), `shelters`, `sightings`, `reports` y migración inicial
- [x] Validación (publicación, cambio de custodia, avistamiento, alta de protectora) y utilidades de privacidad con tests
- [x] Guía de desarrollo, arquitectura, CI en GitHub Actions
- [ ] Crear repo en GitHub y conectar a Vercel
- [ ] Añadir Neon y Blob desde Vercel Storage; `vercel env pull`; `npm run db:migrate`
- [ ] `/api/health` en verde en producción

## Fase 1 — MVP

**Base**

- [ ] Componentes UI base (`Button`, `Input`, `Select`, `Card`, `Badge`)
- [ ] Componente de mapa (Leaflet + OSM): pin seleccionable, marcadores, polilínea
- [ ] Subida de foto con compresión en cliente + `/api/blob/upload`

**Protectoras**

- [ ] Script/seed de alta de protectoras (`createShelterSchema`) con las de la zona
- [ ] `/protectoras`: mapa y listado de las aprobadas
- [ ] Query de protectoras cercanas (`NEARBY_SHELTERS_RADIUS_KM`)

**Publicaciones**

- [ ] `/publicar`: foto → animal y chapa → lugar del hallazgo → **¿dónde está ahora?** → contacto
- [ ] Server Action `createPost` + enlace secreto de gestión
- [ ] `/`: listado de publicaciones activas (recientes / cercanas), filtros por especie, custodia, radio y fecha
- [ ] `/mascota/[id]`: detalle con lugar aproximado, custodia (zona / protectora / reguero) y contacto
- [ ] Cambiar custodia y marcar como reunido desde el enlace de gestión

**Reguero de avistamientos**

- [ ] Botón "Lo he visto" en publicaciones `not_caught` + Server Action `createSighting`
- [ ] Mapa del reguero con `buildTrail` (último punto destacado, antiguos atenuados)
- [ ] Compartir el enlace del reguero (og-image con el último avistamiento) para difundir por WhatsApp

**Operación y legal**

- [ ] Denunciar publicación
- [ ] Cron diario de caducidad (archivar + borrar datos privados y blobs)
- [ ] Aviso legal, privacidad, cookies; Vercel Web Analytics

## Fase 2 — Comunidad y anti-abuso

- [ ] Cuentas con Better Auth (Google + enlace mágico por email)
- [ ] Rate limiting (Upstash Redis) + honeypot en publicaciones, avistamientos y denuncias
- [ ] Formulario público de solicitud de alta de protectoras + panel de moderación
- [ ] Alertas por zona (email) cuando se publica un animal cerca o hay un avistamiento nuevo en un reguero que sigues
- [ ] Tests e2e con Playwright de los flujos críticos

## Fase 3 — Ideas

- [ ] Panel para protectoras: ver y gestionar los animales que se les han dejado
- [ ] Publicaciones de "se busca" por parte de dueños
- [ ] **Matching por similitud de imagen** entre "se busca" y "encontrado" (embeddings de imagen + `pgvector` en Neon)
- [ ] Predicción de la zona probable del animal a partir del reguero (dirección y velocidad de los avistamientos)
- [ ] PWA instalable con notificaciones push
