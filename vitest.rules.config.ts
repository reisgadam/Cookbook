import { defineConfig } from "vitest/config";

// Firestore security-rule tests; they need the emulator (npm run test:rules).
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
