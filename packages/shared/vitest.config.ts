import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@stratum/shared",
    environment: "node",
  },
});
