import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  CUSTODY_STATUSES,
  POST_STATUSES,
  REPORT_REASONS,
  SPECIES,
} from "@/features/posts/constants";
import { SHELTER_KINDS, SHELTER_STATUSES } from "@/features/shelters/constants";

export const custodyStatus = pgEnum("custody_status", CUSTODY_STATUSES);
export const species = pgEnum("species", SPECIES);
export const postStatus = pgEnum("post_status", POST_STATUSES);
export const reportReason = pgEnum("report_reason", REPORT_REASONS);
export const shelterKind = pgEnum("shelter_kind", SHELTER_KINDS);
export const shelterStatus = pgEnum("shelter_status", SHELTER_STATUSES);

/*
 * Todas las tablas tienen RLS activado y SIN políticas: la API pública de Supabase
 * (PostgREST, con la clave publishable) no puede leer ni escribir nada. La app se
 * conecta como propietaria de las tablas, que no está sujeta a RLS.
 */

/* ------------------------------------------------------------------ cuentas
 * Tablas de Better Auth (src/lib/auth). Los nombres de propiedad son los que espera
 * Better Auth; las columnas siguen nuestra convención snake_case. Ids de texto
 * generados por Better Auth.
 */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
).enableRLS();

/** Métodos de acceso de cada usuario: "credential" (email+contraseña), "google", "apple". */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"), // hash (scrypt), nunca la contraseña
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
).enableRLS();

/** Tokens de verificación de email y de recuperación de contraseña. */
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
).enableRLS();

/** Contadores del límite de intentos de Better Auth (en BD: en serverless no hay memoria compartida). */
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
}).enableRLS();

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Protectoras, perreras y veterinarios dados de alta como puntos de referencia
 * donde dejar un animal encontrado. Son entidades públicas: su ubicación
 * y contacto se muestran completos.
 */
export const shelters = pgTable(
  "shelters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: shelterKind("kind").notNull(),
    status: shelterStatus("status").notNull().default("pending"),
    name: text("name").notNull(),
    address: text("address").notNull(),
    locality: text("locality").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    openingHours: text("opening_hours"),
    /** true = confirmado que aceptan animales encontrados · false = no · null = sin confirmar. */
    acceptsDropOff: boolean("accepts_drop_off"),
    /** Cómo entregar un animal (p. ej. "llama antes a la Policía Local para leer el chip"). */
    dropOffNotes: text("drop_off_notes"),
    ...timestamps,
  },
  (t) => [
    index("shelters_status_idx").on(t.status),
    index("shelters_lat_lng_idx").on(t.lat, t.lng),
  ],
).enableRLS();

/**
 * Publicación de un animal encontrado.
 * Los campos marcados como PRIVADO nunca se envían tal cual al cliente
 * (ver docs/GUIDELINES.md § Privacidad).
 */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    species: species("species").notNull(),
    status: postStatus("status").notNull().default("active"),
    description: text("description").notNull().default(""),

    photoUrl: text("photo_url").notNull(),
    photoPathname: text("photo_pathname").notNull(), // para borrar el blob

    hasTag: boolean("has_tag").notNull().default(false),
    tagText: text("tag_text"), // texto de la chapa (nombre del animal…)
    tagPhone: text("tag_phone"), // PRIVADO: se muestra enmascarado

    // Dónde se encontró / se vio por primera vez
    foundLat: doublePrecision("found_lat").notNull(), // PRIVADO: se expone redondeado
    foundLng: doublePrecision("found_lng").notNull(),
    locality: text("locality").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),

    // Dónde está ahora
    custody: custodyStatus("custody").notNull(),
    shelterId: uuid("shelter_id").references(() => shelters.id, { onDelete: "restrict" }),
    custodyLat: doublePrecision("custody_lat"), // PRIVADO: casa de quien lo tiene → solo zona
    custodyLng: doublePrecision("custody_lng"),

    finderName: text("finder_name").notNull(),
    finderContact: text("finder_contact").notNull(),
    /** Quien publicó, si tenía la sesión iniciada (si borra su cuenta, se borran sus publicaciones). */
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    /** SHA-256 del token del enlace secreto de gestión. El token en claro nunca se guarda. */
    manageTokenHash: text("manage_token_hash").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("posts_status_created_idx").on(t.status, t.createdAt),
    index("posts_found_lat_lng_idx").on(t.foundLat, t.foundLng),
    index("posts_shelter_idx").on(t.shelterId),
    index("posts_author_idx").on(t.authorId),
    // Coherencia entre custodia y campos asociados
    check(
      "posts_custody_shelter_chk",
      sql`(${t.custody} = 'at_shelter') = (${t.shelterId} IS NOT NULL)`,
    ),
    check(
      "posts_custody_location_chk",
      sql`(${t.custodyLat} IS NULL AND ${t.custodyLng} IS NULL) OR (${t.custody} = 'with_finder' AND ${t.custodyLat} IS NOT NULL AND ${t.custodyLng} IS NOT NULL)`,
    ),
  ],
).enableRLS();

/**
 * Reguero de avistamientos de un animal que no se ha podido atrapar.
 * Cualquiera puede añadir uno a una publicación activa.
 */
export const sightings = pgTable(
  "sightings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
    note: text("note"),
    photoUrl: text("photo_url"),
    photoPathname: text("photo_pathname"),
    reporterName: text("reporter_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sightings_post_seen_idx").on(t.postId, t.seenAt)],
).enableRLS();

/** Denuncias de usuarios para moderación. */
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  reason: reportReason("reason").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export type User = typeof users.$inferSelect;
export type Shelter = typeof shelters.$inferSelect;
export type NewShelter = typeof shelters.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Sighting = typeof sightings.$inferSelect;
export type NewSighting = typeof sightings.$inferInsert;
