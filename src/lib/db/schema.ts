import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
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
    acceptsDropOff: boolean("accepts_drop_off").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("shelters_status_idx").on(t.status),
    index("shelters_lat_lng_idx").on(t.lat, t.lng),
  ],
);

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
    authorId: text("author_id"), // se rellenará cuando haya auth (fase 2)

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("posts_status_created_idx").on(t.status, t.createdAt),
    index("posts_found_lat_lng_idx").on(t.foundLat, t.foundLng),
    index("posts_shelter_idx").on(t.shelterId),
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
);

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
);

/** Denuncias de usuarios para moderación. */
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  reason: reportReason("reason").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Shelter = typeof shelters.$inferSelect;
export type NewShelter = typeof shelters.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Sighting = typeof sightings.$inferSelect;
export type NewSighting = typeof sightings.$inferInsert;
