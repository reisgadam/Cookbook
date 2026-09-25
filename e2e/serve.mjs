#!/usr/bin/env node
// Serves the built site (dist/) the way GitHub Pages does, so the end-to-end
// tests catch anything that would break once deployed:
//   - the site lives under /Cookbook/
//   - a folder is served from its index.html, and a folder address without the
//     trailing slash redirects to the one with it
//   - there is no single-page-app fallback: unknown addresses get 404.html
//
// Usage: node e2e/serve.mjs [port]   (default 4173)

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "/Cookbook/";
const ROOT = fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

const isFile = (file) =>
  stat(file).then(
    (s) => s.isFile(),
    () => false,
  );
const isDir = (file) =>
  stat(file).then(
    (s) => s.isDirectory(),
    () => false,
  );

function send(res, status, file, method) {
  res.writeHead(status, {
    "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  if (method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }

  if (pathname.startsWith(BASE) || pathname === BASE.slice(0, -1)) {
    const relative = pathname.slice(BASE.length);
    const file = path.join(ROOT, relative);
    if (!file.startsWith(ROOT) && file !== ROOT.slice(0, -1)) {
      res.writeHead(400).end();
      return;
    }
    if (pathname.endsWith("/")) {
      if (await isFile(path.join(file, "index.html"))) return send(res, 200, path.join(file, "index.html"), req.method);
    } else if (await isFile(file)) {
      return send(res, 200, file, req.method);
    } else if (await isDir(file)) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
      return;
    }
  }
  send(res, 404, path.join(ROOT, "404.html"), req.method);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving dist/ like GitHub Pages at http://127.0.0.1:${PORT}${BASE}`);
});
