# DogWhere 🐾

Publica la foto de un animal que has encontrado o visto suelto —con los datos de su chapa si la lleva— para que su familia pueda encontrarlo.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · Neon Postgres + Drizzle · Vercel Blob · Vercel

## Puesta en marcha

Requisitos: Node.js 22+ y npm.

```bash
npm install
cp .env.example .env.local      # o: npx vercel link && npx vercel env pull .env.local
npm run db:migrate              # necesita DATABASE_URL
npm run dev
```

Abre http://localhost:3000. Comprobación de salud: http://localhost:3000/api/health

## Scripts

| Script                      | Qué hace                                            |
| --------------------------- | --------------------------------------------------- |
| `npm run dev`               | Servidor de desarrollo                              |
| `npm run build` / `start`   | Build y servidor de producción                      |
| `npm run check`             | Lint + tipos + formato + tests (lo mismo que la CI) |
| `npm run lint` / `lint:fix` | ESLint                                              |
| `npm run typecheck`         | Tipos de rutas + `tsc --noEmit`                     |
| `npm run format`            | Prettier                                            |
| `npm test` / `test:watch`   | Vitest                                              |
| `npm run db:generate`       | Genera una migración desde el esquema               |
| `npm run db:migrate`        | Aplica migraciones                                  |
| `npm run db:studio`         | Drizzle Studio                                      |

## Documentación

- [Guía de desarrollo](docs/GUIDELINES.md) — estándares del proyecto (léela antes de contribuir)
- [Arquitectura](docs/ARCHITECTURE.md) — componentes, modelo de datos y decisiones
- [Roadmap](docs/ROADMAP.md)

## Despliegue

Cada push a `main` despliega en producción en Vercel; cada PR genera una preview. Configuración inicial en [GUIDELINES.md § 12](docs/GUIDELINES.md#12-despliegue-en-vercel).
