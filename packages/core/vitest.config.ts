import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@karta/core",
    environment: "node",
  },
});
