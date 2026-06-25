import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", "tests/e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // `server-only` is a Next build-time guard with no runtime behavior;
      // stub it so server modules (rate-limit, research) are testable.
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
    },
  },
});
