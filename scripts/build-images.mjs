#!/usr/bin/env node
// Builds the web-ready versions of the recipe photos.
//
// Sources (committed, never deployed):
//   content/photos/*.JPG            original phone photos of the recipe cards
//   content/photos/family/*.jpg     family photos used on the home and about pages
//   content/photos/photos.json      per-photo rotation so the writing reads upright
//
// Outputs:
//   public/photos/{sm,md,lg,xl}/<name>.webp  sizes for tiles, pages (phone and desktop) and zoom (gitignored)
//   public/photos/og/<name>.jpg            1200x630 link-preview images (gitignored)
//   public/photos/family/...               responsive family photo sizes (gitignored)
//   src/generated/photos.json              dimensions + placeholder colours (committed)
//
// A photo is only re-processed when its bytes or settings change, so repeat
// runs take a couple of seconds.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = path.join(ROOT, "content/photos");
const FAMILY_DIR = path.join(SRC_DIR, "family");
const OUT_DIR = path.join(ROOT, "public/photos");
const CACHE_FILE = path.join(ROOT, ".cache/build-images.json");
const MANIFEST_FILE = path.join(ROOT, "src/generated/photos.json");

// Bump when output settings change to force a full rebuild.
const PIPELINE_VERSION = 1;

const PAPER = "#FBF6EE";
const RECIPE_SIZES = {
  sm: { max: 360, quality: 72 },
  md: { max: 720, quality: 76 },
  lg: { max: 1200, quality: 78 },
  xl: { max: 2400, quality: 80 },
};
const FAMILY_WIDTHS = [640, 1200, 1800];
const OG = { width: 1200, height: 630 };
const CONCURRENCY = 4;

const isImage = (name) => /\.(jpe?g|png)$/i.test(name);
const baseName = (name) => name.replace(/\.[^.]+$/, "");

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function hashOf(buffer, settings) {
  return (
    createHash("sha1")
      .update(buffer)
      // Changing any output size re-processes every photo, too.
      .update(JSON.stringify({ settings, PIPELINE_VERSION, RECIPE_SIZES, FAMILY_WIDTHS, OG }))
      .digest("hex")
  );
}

function toHex({ r, g, b }) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * Decodes a photo once, auto-oriented from EXIF plus the manifest's extra
 * rotation, and returns a factory for pipelines over the raw upright pixels.
 */
async function decodeUpright(buffer, rotate = 0) {
  const { data, info } = await sharp(buffer)
    .autoOrient()
    .rotate(rotate)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: info.channels };
  return { image: () => sharp(data, { raw }), info };
}

async function processRecipePhoto(file, rotate) {
  const source = await readFile(path.join(SRC_DIR, file));
  const { image, info } = await decodeUpright(source, rotate);
  const name = baseName(file);
  const widths = {};
  let color = PAPER;

  for (const [size, { max, quality }] of Object.entries(RECIPE_SIZES)) {
    const out = path.join(OUT_DIR, size, `${name}.webp`);
    const result = await image()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(out);
    widths[size] = result.width;
    if (size === "sm") {
      const { dominant } = await sharp(out).stats();
      color = toHex(dominant);
    }
  }

  // Link previews show the whole card on a paper-coloured background.
  const card = await image()
    .resize({ width: OG.width - 80, height: OG.height - 60, fit: "inside" })
    .png()
    .toBuffer();
  await sharp({ create: { width: OG.width, height: OG.height, channels: 3, background: PAPER } })
    .composite([{ input: card, gravity: "centre" }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(OUT_DIR, "og", `${name}.jpg`));

  return { w: info.width, h: info.height, color, widths };
}

async function processFamilyPhoto(file, { rotate = 0, focusY = 0.5 } = {}) {
  const source = await readFile(path.join(FAMILY_DIR, file));
  const { image, info } = await decodeUpright(source, rotate);
  const name = baseName(file);
  const widths = [];

  for (const width of FAMILY_WIDTHS) {
    const result = await image()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(path.join(OUT_DIR, "family", `${name}-${width}.webp`));
    widths.push(result.width);
  }
  const { dominant } = await sharp(await image().resize({ width: 64 }).png().toBuffer()).stats();

  // Crop a 1200x630 band centred on focusY for link previews.
  const scale = OG.width / info.width;
  const scaledHeight = Math.round(info.height * scale);
  const top = Math.min(
    Math.max(0, Math.round(focusY * scaledHeight - OG.height / 2)),
    Math.max(0, scaledHeight - OG.height),
  );
  await image()
    .resize({ width: OG.width })
    .extract({ left: 0, top, width: OG.width, height: Math.min(OG.height, scaledHeight) })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT_DIR, "og", `${name}.jpg`));

  return { w: info.width, h: info.height, color: toHex(dominant), widths };
}

async function runPool(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

function outputsExist(kind, name) {
  if (kind === "family") {
    return (
      FAMILY_WIDTHS.every((w) => existsSync(path.join(OUT_DIR, "family", `${name}-${w}.webp`))) &&
      existsSync(path.join(OUT_DIR, "og", `${name}.jpg`))
    );
  }
  return (
    Object.keys(RECIPE_SIZES).every((s) => existsSync(path.join(OUT_DIR, s, `${name}.webp`))) &&
    existsSync(path.join(OUT_DIR, "og", `${name}.jpg`))
  );
}

async function pruneStale(expected) {
  for (const dir of [...Object.keys(RECIPE_SIZES), "og", "family"]) {
    const full = path.join(OUT_DIR, dir);
    for (const file of await readdir(full)) {
      if (!expected.has(`${dir}/${file}`)) await rm(path.join(full, file));
    }
  }
}

async function main() {
  const started = Date.now();
  const settings = await readJson(path.join(SRC_DIR, "photos.json"), null);
  if (!settings) throw new Error("content/photos/photos.json is missing or invalid");

  for (const dir of [...Object.keys(RECIPE_SIZES), "og", "family"]) {
    await mkdir(path.join(OUT_DIR, dir), { recursive: true });
  }
  await mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });

  const cache = await readJson(CACHE_FILE, { entries: {} });
  const nextCache = { entries: {} };
  const manifest = { photos: {}, family: {} };
  const expected = new Set();
  let built = 0;

  const recipeFiles = (await readdir(SRC_DIR)).filter(isImage).sort();
  const missing = recipeFiles.filter((f) => !(f in settings.rotations));
  if (missing.length) {
    throw new Error(`Add these photos to content/photos/photos.json "rotations": ${missing.join(", ")}`);
  }
  const familyFiles = existsSync(FAMILY_DIR) ? (await readdir(FAMILY_DIR)).filter(isImage).sort() : [];

  const jobs = [
    ...recipeFiles.map((file) => ({ kind: "recipe", file, opts: settings.rotations[file] })),
    ...familyFiles.map((file) => ({ kind: "family", file, opts: settings.family?.[file] ?? {} })),
  ];

  await runPool(jobs, async ({ kind, file, opts }) => {
    const dir = kind === "family" ? FAMILY_DIR : SRC_DIR;
    const name = baseName(file);
    const key = `${kind}:${file}`;
    const hash = hashOf(await readFile(path.join(dir, file)), opts);

    let entry =
      cache.entries[key]?.hash === hash && outputsExist(kind, name) ? cache.entries[key].data : null;
    if (!entry) {
      entry = kind === "family" ? await processFamilyPhoto(file, opts) : await processRecipePhoto(file, opts);
      built++;
    }
    nextCache.entries[key] = { hash, data: entry };
    (kind === "family" ? manifest.family : manifest.photos)[file] = entry;

    if (kind === "family") {
      FAMILY_WIDTHS.forEach((w) => expected.add(`family/${name}-${w}.webp`));
    } else {
      Object.keys(RECIPE_SIZES).forEach((s) => expected.add(`${s}/${name}.webp`));
    }
    expected.add(`og/${name}.jpg`);
  });

  await pruneStale(expected);

  // Stable key order keeps the committed manifest diff-friendly.
  const sorted = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
  const json =
    JSON.stringify({ photos: sorted(manifest.photos), family: sorted(manifest.family) }, null, 2) + "\n";
  const previous = existsSync(MANIFEST_FILE) ? await readFile(MANIFEST_FILE, "utf8") : "";
  if (json !== previous) await writeFile(MANIFEST_FILE, json);
  await writeFile(CACHE_FILE, JSON.stringify(nextCache));

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`images: ${jobs.length} photos (${built} rebuilt) in ${seconds}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
