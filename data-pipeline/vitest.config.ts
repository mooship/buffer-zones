import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "buffer-zones-data-pipeline",
    environment: "node",
  },
});
