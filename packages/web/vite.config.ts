import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    FontaineTransform.vite({
      fallbacks: ["Arial", "sans-serif"],
      resolvePath: (id) => new URL(`./node_modules/${id}`, import.meta.url),
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "e2e/**",
    ],
  },
});
