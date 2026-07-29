import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@buffer-zones/shared",
    environment: "node",
  },
});
