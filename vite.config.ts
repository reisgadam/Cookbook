import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path must match the GitHub Pages repo name: https://reisgadam.github.io/Cookbook/
export default defineConfig({
  base: "/Cookbook/",
  plugins: [react()],
});
