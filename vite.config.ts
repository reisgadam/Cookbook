/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { staticRoutes } from "./vite-plugins/staticRoutes";

// Base path must match the GitHub Pages repo name: https://reisgadam.github.io/Cookbook/
export default defineConfig({
  base: "/Cookbook/",
  plugins: [react(), staticRoutes()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
