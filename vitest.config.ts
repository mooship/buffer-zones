import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "data-pipeline"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**", "data-pipeline/src/**"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/main.tsx",
        "**/vite-env.d.ts",
        "data-pipeline/src/run.ts",
        "data-pipeline/src/buildDisplayData.ts",
        "packages/web/src/entry.client.tsx",
        "packages/web/src/entry.server.tsx",
        "packages/web/src/routes/**",
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
