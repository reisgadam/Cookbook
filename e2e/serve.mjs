#!/usr/bin/env node
// Serves the built site (dist/) the way GitHub Pages does, so the end-to-end
// tests catch anything that would break once deployed:
//   - the site lives under /Cookbook/
//   - a folder is served from its index.html, and a folder address without the
//     trailing slash redirects to the one with it
//   - there is no single-page-app fallback: unknown addresses get 404.html
//   - text files are gzipped, and browsers may reuse any file for 10 minutes
//
// Usage: node e2e/serve.mjs [port]   (default 4173)

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

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

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json|xml)|image\/svg\+xml)/;

function send(req, res, status, file) {
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const gzip = COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "max-age=600",
    ...(gzip ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" } : {}),
  });
  if (req.method === "HEAD") return res.end();
  const body = createReadStream(file);
  (gzip ? body.pipe(createGzip()) : body).pipe(res);
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
      if (await isFile(path.join(file, "index.html")))
        return send(req, res, 200, path.join(file, "index.html"));
    } else if (await isFile(file)) {
      return send(req, res, 200, file);
    } else if (await isDir(file)) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
      return;
    }
  }
  send(req, res, 404, path.join(ROOT, "404.html"));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving dist/ like GitHub Pages at http://127.0.0.1:${PORT}${BASE}`);
});
