import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@stratum/react",
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
