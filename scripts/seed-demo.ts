/**
 * Crea publicaciones DE PRUEBA para revisar la app (p. ej. desde el móvil) y las borra.
 *
 *   npm run db:seed:demo -- --site=https://dogwhere-three.vercel.app
 *   npm run db:seed:demo -- --clean
 *
 * - Crea 9 publicaciones (3 por custodia) en situaciones distintas: con y sin chapa,
 *   con y sin casa marcada, reunida, en varias protectoras, reguero reciente, reguero
 *   antiguo y animal suelto sin avistamientos todavía.
 * - Todas llevan "[PRUEBA]" en la descripción y el contacto pruebas@dogwhere.test,
 *   que es lo que usa `--clean` para borrarlas (con sus fotos y avistamientos).
 * - Las fotos son ilustraciones generadas aquí, subidas a Vercel Blob (o a
 *   public/dev-uploads si no hay BLOB_READ_WRITE_TOKEN).
 * - Imprime el enlace público y el de gestión de cada una.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { del, put } from "@vercel/blob";
import { eq, inArray, like } from "drizzle-orm";
import sharp from "sharp";

import type { CustodyStatus, Species } from "../src/features/posts/constants";
import { createDbClient } from "../src/lib/db/client";
import { posts, shelters, sightings } from "../src/lib/db/schema";
import { generateToken, hashToken } from "../src/lib/tokens";

loadEnvConfig(process.cwd());

const DEMO_CONTACT = "pruebas@dogwhere.test";
const DEMO_PREFIX = "[PRUEBA] ";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Coords = { lat: number; lng: number };

type DemoSighting = { hoursAgo: number; at: Coords; note?: string; reporter?: string };

type DemoPost = {
  label: string;
  species: Species;
  /** Texto que se pinta en la ilustración. */
  art: { bg: string; fg: string; name: string };
  description: string;
  locality: string;
  found: Coords;
  hoursAgo: number;
  tag?: { text?: string; phone?: string };
  custody: CustodyStatus;
  /** Prefijo del nombre de la protectora (at_shelter). */
  shelter?: string;
  home?: Coords;
  status?: "active" | "reunited";
  finderName: string;
  sightings?: DemoSighting[];
};

const DEMOS: DemoPost[] = [
  // ---------------- En casa de quien lo encontró
  {
    label: "Casa · con chapa y zona de la casa",
    species: "dog",
    art: { bg: "#c8a27a", fg: "#5a3b1e", name: "Toby" },
    description: "Mediano, marrón, collar rojo. Muy cariñoso, algo asustado con los coches.",
    locality: "Xàbia",
    found: { lat: 38.7919, lng: 0.1736 },
    hoursAgo: 2,
    tag: { text: "Toby", phone: "612 345 678" },
    custody: "with_finder",
    home: { lat: 38.7885, lng: 0.1662 },
    finderName: "Laura",
  },
  {
    label: "Casa · sin chapa ni zona",
    species: "cat",
    art: { bg: "#7d8a96", fg: "#2b323a", name: "Gata gris" },
    description:
      "Gata gris atigrada, joven. Estaba debajo de un coche en la calle Marqués de Campo.",
    locality: "Dénia",
    found: { lat: 38.8405, lng: 0.1063 },
    hoursAgo: 26,
    custody: "with_finder",
    finderName: "Pere",
  },
  {
    label: "Casa · YA REUNIDO (banner verde)",
    species: "dog",
    art: { bg: "#e8d9b0", fg: "#6b5a2a", name: "Luna" },
    description: "Golden pequeña con arnés azul. ¡Su familia ya la ha recogido!",
    locality: "Benitachell",
    found: { lat: 38.7342, lng: 0.1418 },
    hoursAgo: 50,
    tag: { text: "Luna" },
    custody: "with_finder",
    status: "reunited",
    finderName: "Marc",
  },

  // ---------------- En una protectora
  {
    label: "Protectora · APASA (Xàbia), con teléfono en la chapa",
    species: "dog",
    art: { bg: "#3a3a3a", fg: "#d9d9d9", name: "Negro" },
    description: "Perro grande negro, tipo labrador. Lo he llevado a APASA esta mañana.",
    locality: "Xàbia",
    found: { lat: 38.7752, lng: 0.1913 },
    hoursAgo: 4,
    tag: { phone: "+34 698 112 233" },
    custody: "at_shelter",
    shelter: "APASA",
    finderName: "Sergio",
  },
  {
    label: "Protectora · APAD (Dénia)",
    species: "cat",
    art: { bg: "#f0a35e", fg: "#7a3d0c", name: "Naranja" },
    description: "Gato naranja adulto, sin collar. Herida pequeña en una oreja.",
    locality: "Dénia",
    found: { lat: 38.8364, lng: 0.1217 },
    hoursAgo: 52,
    custody: "at_shelter",
    shelter: "APAD",
    finderName: "Núria",
  },
  {
    label: "Protectora · APROP (Pego), especie «otro», lejos de Xàbia",
    species: "other",
    art: { bg: "#efe6da", fg: "#8a6d4b", name: "Conejo" },
    description: "Conejo blanco con manchas marrones, muy manso. Seguramente doméstico.",
    locality: "Pego",
    found: { lat: 38.8452, lng: -0.1163 },
    hoursAgo: 30,
    custody: "at_shelter",
    shelter: "APROP",
    finderName: "Jordi",
  },

  // ---------------- Sin capturar (reguero)
  {
    label: "Suelto · reguero RECIENTE de 4 avistamientos",
    species: "dog",
    art: { bg: "#d8c3a5", fg: "#4b3a26", name: "Podenco" },
    description: "Podenco canela, muy rápido y asustadizo. No se deja coger: no lo persigáis.",
    locality: "Xàbia",
    found: { lat: 38.7963, lng: 0.1826 },
    hoursAgo: 7,
    custody: "not_caught",
    finderName: "Ana",
    sightings: [
      { hoursAgo: 5.5, at: { lat: 38.7951, lng: 0.1798 }, note: "Cruzando por el puerto" },
      { hoursAgo: 4, at: { lat: 38.7912, lng: 0.1761 }, reporter: "Luis" },
      {
        hoursAgo: 2,
        at: { lat: 38.7874, lng: 0.1702 },
        note: "Bebiendo agua en la fuente",
        reporter: "Carmen",
      },
      { hoursAgo: 0.5, at: { lat: 38.7838, lng: 0.1655 }, note: "Iba hacia el Montgó" },
    ],
  },
  {
    label: "Suelto · reguero ANTIGUO (>48 h, puntos atenuados)",
    species: "cat",
    art: { bg: "#2f2f2f", fg: "#f2f2f2", name: "Blanquinegro" },
    description: "Gato blanco y negro con collar verde sin chapa.",
    locality: "Teulada",
    found: { lat: 38.7295, lng: 0.1042 },
    hoursAgo: 80,
    custody: "not_caught",
    finderName: "Rosa",
    sightings: [
      { hoursAgo: 70, at: { lat: 38.7311, lng: 0.1071 }, reporter: "Toni" },
      { hoursAgo: 60, at: { lat: 38.7334, lng: 0.1103 }, note: "En el tejado del colegio" },
    ],
  },
  {
    label: "Suelto · recién visto, sin avistamientos aún",
    species: "dog",
    art: { bg: "#b9b9b9", fg: "#404040", name: "Gris" },
    description: "Perro pequeño gris, pelo largo, cojea de la pata trasera.",
    locality: "Pedreguer",
    found: { lat: 38.7934, lng: 0.0331 },
    hoursAgo: 0.5,
    custody: "not_caught",
    finderName: "Pablo",
  },
];

/* ------------------------------------------------------------- fotos */

function illustration({ bg, fg, name }: DemoPost["art"], species: Species) {
  const ears =
    species === "cat"
      ? `<polygon points="430,330 470,190 540,300" fill="${fg}"/><polygon points="770,330 730,190 660,300" fill="${fg}"/>`
      : species === "dog"
        ? `<ellipse cx="420" cy="380" rx="60" ry="130" fill="${fg}" transform="rotate(20 420 380)"/><ellipse cx="780" cy="380" rx="60" ry="130" fill="${fg}" transform="rotate(-20 780 380)"/>`
        : `<ellipse cx="530" cy="200" rx="38" ry="140" fill="${fg}"/><ellipse cx="670" cy="200" rx="38" ry="140" fill="${fg}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <rect width="1200" height="900" fill="${bg}"/>
    ${ears}
    <circle cx="600" cy="460" r="230" fill="${fg}" opacity="0.92"/>
    <circle cx="520" cy="430" r="26" fill="${bg}"/><circle cx="680" cy="430" r="26" fill="${bg}"/>
    <ellipse cx="600" cy="530" rx="40" ry="28" fill="${bg}"/>
    <rect x="0" y="780" width="1200" height="120" fill="#ffd23f"/>
    <text x="600" y="858" font-family="Arial, sans-serif" font-size="56" font-weight="700"
      text-anchor="middle" fill="#1d2433">FOTO DE PRUEBA · ${name}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

async function upload(buffer: Buffer, folder: "posts" | "sightings") {
  const pathname = `${folder}/demo-${randomUUID()}.webp`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return { url: blob.url, pathname: blob.pathname };
  }
  const target = path.join(process.cwd(), "public", "dev-uploads", pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return { url: `/dev-uploads/${pathname}`, pathname };
}

/* ------------------------------------------------------------ comandos */

async function clean(db: ReturnType<typeof createDbClient>) {
  const demo = await db
    .select({ id: posts.id, pathname: posts.photoPathname })
    .from(posts)
    .where(eq(posts.finderContact, DEMO_CONTACT));
  if (demo.length === 0) {
    console.log("No hay publicaciones de prueba.");
    return;
  }
  const ids = demo.map((d) => d.id);
  const sightingPhotos = await db
    .select({ pathname: sightings.photoPathname })
    .from(sightings)
    .where(inArray(sightings.postId, ids));
  await db.delete(posts).where(inArray(posts.id, ids)); // avistamientos y denuncias en cascada

  const pathnames = [
    ...demo.map((d) => d.pathname),
    ...sightingPhotos.map((s) => s.pathname ?? ""),
  ].filter((p) => p.includes("/demo-"));
  if (process.env.BLOB_READ_WRITE_TOKEN && pathnames.length) await del(pathnames);
  console.log(`Borradas ${demo.length} publicaciones de prueba y ${pathnames.length} fotos.`);
}

async function seed(db: ReturnType<typeof createDbClient>, site: string) {
  const now = Date.now();
  const allShelters = await db
    .select({ id: shelters.id, name: shelters.name })
    .from(shelters)
    .where(eq(shelters.status, "approved"));

  const rows: string[] = [];
  for (const demo of DEMOS) {
    let shelterId: string | null = null;
    if (demo.custody === "at_shelter") {
      shelterId = allShelters.find((s) => s.name.startsWith(demo.shelter ?? "∅"))?.id ?? null;
      if (!shelterId) {
        rows.push(
          `✗ ${demo.label}: no existe la protectora «${demo.shelter}» (¿has hecho el seed?)`,
        );
        continue;
      }
    }

    const photo = await upload(await illustration(demo.art, demo.species), "posts");
    const token = generateToken();
    const seenAt = new Date(now - demo.hoursAgo * HOUR);

    const [created] = await db
      .insert(posts)
      .values({
        species: demo.species,
        status: demo.status ?? "active",
        description: DEMO_PREFIX + demo.description,
        photoUrl: photo.url,
        photoPathname: photo.pathname,
        hasTag: !!demo.tag,
        tagText: demo.tag?.text ?? null,
        tagPhone: demo.tag?.phone?.replace(/[\s+]/g, "").replace(/^34/, "") ?? null,
        foundLat: demo.found.lat,
        foundLng: demo.found.lng,
        locality: demo.locality,
        seenAt,
        custody: demo.custody,
        shelterId,
        custodyLat: demo.home?.lat ?? null,
        custodyLng: demo.home?.lng ?? null,
        finderName: demo.finderName,
        finderContact: DEMO_CONTACT,
        manageTokenHash: hashToken(token),
        expiresAt: new Date(now + (demo.status === "reunited" ? 7 : 60) * DAY),
        createdAt: seenAt,
      })
      .returning({ id: posts.id });

    for (const s of demo.sightings ?? []) {
      await db.insert(sightings).values({
        postId: created.id,
        lat: s.at.lat,
        lng: s.at.lng,
        seenAt: new Date(now - s.hoursAgo * HOUR),
        note: s.note ?? null,
        reporterName: s.reporter ?? null,
        createdAt: new Date(now - s.hoursAgo * HOUR),
      });
    }

    rows.push(
      [
        `+ ${demo.label}`,
        `    ver:       ${site}/mascota/${created.id}`,
        `    gestionar: ${site}/gestionar/${created.id}/${token}`,
      ].join("\n"),
    );
  }

  console.log(rows.join("\n\n"));
  console.log(
    `\nListo. Pueden tardar hasta 1 minuto en aparecer en el listado (caché).` +
      `\nPara borrarlas: npm run db:seed:demo -- --clean`,
  );
}

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta POSTGRES_URL (¿has hecho `vercel env pull .env.local`?)");
  const db = createDbClient(url);

  const args = process.argv.slice(2);
  const siteArg = args.find((a) => a.startsWith("--site="))?.slice("--site=".length);
  const site = (siteArg ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  if (args.includes("--clean")) {
    await clean(db);
  } else {
    // Evita duplicados si se ejecuta dos veces.
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(like(posts.finderContact, DEMO_CONTACT))
      .limit(1);
    if (existing && !args.includes("--force")) {
      console.log(
        "Ya hay publicaciones de prueba. Bórralas con --clean o añade --force para crear más.",
      );
      process.exit(0);
    }
    await seed(db, site);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
