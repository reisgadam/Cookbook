/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { site } from "./src/site.config";
import { staticRoutes } from "./vite-plugins/staticRoutes";

// Base path must match the GitHub Pages repo name: https://reisgadam.github.io/Cookbook/
const base = "/Cookbook/";

export default defineConfig({
  base,
  build: {
    // Firebase (about 700 kB) is the one big file. It only loads once comments
    // are set up, after the page has appeared, so there's no need to warn about it.
    chunkSizeWarningLimit: 750,
  },
  plugins: [
    react(),
    staticRoutes(),
    // Makes the site installable on a phone's home screen and keeps it working
    // with patchy kitchen Wi-Fi: the page code is saved on the first visit, and
    // each photo once it has been viewed. src/lib/serviceWorker.ts registers it.
    VitePWA({
      injectRegister: false,
      manifest: {
        id: base,
        name: site.title,
        short_name: site.title,
        description: site.description,
        lang: "en",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#fbf6ee",
        theme_color: "#fbf6ee",
        categories: ["food", "lifestyle"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "All recipes", url: `${base}recipes/` },
          { name: "My Recipe Box", url: `${base}favorites/` },
          { name: `${site.name}'s notebook`, url: `${base}notebook/` },
        ],
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        // The app shell: every script and stylesheet, and the Latin font files
        // (other alphabets load on demand). Photos are cached as they're viewed.
        // Firebase is left out: it needs a connection anyway, and it's only
        // downloaded once comments are set up.
        globPatterns: ["shell.html", "assets/*.{js,css}", "assets/*-latin-*.woff2"],
        globIgnores: ["**/*-latin-ext-*", "**/firebase-*.js"],
        // Every page is the same app, so any address opens from the saved copy
        // (a plain version of the page that vite-plugins/staticRoutes.ts writes).
        navigateFallback: "shell.html",
        // ...except files opened directly, like a photo in its own tab.
        navigateFallbackDenylist: [/\/photos\//, /\/[^/]+\.[a-z0-9]+$/i],
        // A new version takes over as soon as it's downloaded; the next link
        // anyone clicks loads it (see src/lib/serviceWorker.ts).
        skipWaiting: true,
        clientsClaim: true,
        // Patterns are copied into the service worker as text, so they can't
        // refer to variables. Workbox only matches these against this site.
        runtimeCaching: [
          {
            urlPattern: new RegExp(`${base}photos/`),
            // Photo file names don't change when a photo is re-rotated, so serve
            // the saved copy right away and refresh it in the background.
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "photos",
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Firebase, and fonts for other alphabets, once they're first used.
            // Their file names change whenever their contents do.
            urlPattern: new RegExp(`${base}assets/`),
            handler: "CacheFirst",
            options: {
              cacheName: "assets",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
