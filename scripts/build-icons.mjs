#!/usr/bin/env node
// Renders the app icons (home screen, install prompt) from the favicon
// artwork. Run once after changing the design: node scripts/build-icons.mjs
// The PNGs are committed in public/.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PUBLIC = path.join(fileURLToPath(new URL("..", import.meta.url)), "public");

const card = `
  <g transform="rotate(-6 32 32)">
    <rect x="11" y="15" width="42" height="34" rx="3.5" fill="#FBF6EE"/>
    <path d="M11 23.5h42" stroke="#D9867A" stroke-width="1.8"/>
    <path d="M15 30.5h34M15 36.5h34M15 42.5h34" stroke="#9DB7D5" stroke-width="1.3"/>
    <path d="M32 45c-5.4-3.7-8.3-6.7-8.3-9.8 0-2.3 1.8-4.1 4-4.1 1.8 0 3.2.9 4.3 2.5 1.1-1.6 2.5-2.5 4.3-2.5 2.2 0 4 1.8 4 4.1 0 3.1-2.9 6.1-8.3 9.8z" fill="#B5502F"/>
  </g>`;

const svg = ({ rounded = false, scale = 1 } = {}) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="#B5502F"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${card}</g>
</svg>`);

async function render(source, size, file) {
  await sharp(source, { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, file));
  console.log("wrote", file);
}

await mkdir(path.join(PUBLIC, "icons"), { recursive: true });
// iOS adds its own rounded corners and needs an opaque square.
await render(svg({ scale: 1.08 }), 180, "apple-touch-icon.png");
await render(svg({ rounded: true }), 192, "icons/icon-192.png");
await render(svg({ rounded: true }), 512, "icons/icon-512.png");
// Android crops maskable icons to a circle or squircle: keep the card in the safe zone.
await render(svg({ scale: 0.8 }), 512, "icons/icon-maskable-512.png");
