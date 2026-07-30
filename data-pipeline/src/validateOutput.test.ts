import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const outputManifestMocks = vi.hoisted(() => ({
  validateOutputDirectory: vi.fn<(outputDir: string) => Promise<string[]>>(),
}));

vi.mock("./outputManifest", () => ({
  validateOutputDirectory: outputManifestMocks.validateOutputDirectory,
}));

import { OUTPUT_DIR, runOutputValidation } from "./validateOutput";

describe("validateOutput", () => {
  beforeEach(() => {
    outputManifestMocks.validateOutputDirectory.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs success when validation passes", async () => {
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([]);

    await runOutputValidation();

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      OUTPUT_DIR,
    );
    expect(console.log).toHaveBeenCalledWith(
      "National output validation passed.",
    );
  });

  it("logs all issues and throws when validation fails", async () => {
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([
      "Missing required output file: townships.v1.geojson",
      "Missing required transit network coverage: Gautrain",
    ]);

    await expect(runOutputValidation("/tmp/custom-output")).rejects.toThrow(
      "Output validation failed.",
    );

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      "/tmp/custom-output",
    );
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      "Missing required output file: townships.v1.geojson",
    );
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      "Missing required transit network coverage: Gautrain",
    );
  });
});
