import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@karta/app",
    environment: "node",
  },
});
