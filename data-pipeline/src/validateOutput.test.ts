import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const outputManifestMocks = vi.hoisted(() => ({
  validateOutputDirectory:
    vi.fn<(outputDir: string, config: unknown) => Promise<string[]>>(),
}));

vi.mock("./outputManifest", () => ({
  validateOutputDirectory: outputManifestMocks.validateOutputDirectory,
}));

vi.mock("@stratum/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stratum/shared")>();
  return {
    ...actual,
    REGIONS: [
      { id: "gauteng", label: "Gauteng", kind: "province" },
      { id: "not-yet-built", label: "Not Yet Built", kind: "custom" },
    ],
  };
});

import { GAUTENG_PIPELINE_CONFIG } from "./regions/gautengPipelineConfig";
import {
  runAllRegionsOutputValidation,
  runOutputValidation,
} from "./validateOutput";

const stubConfig = { regionId: "gauteng", metros: [], sources: [] };

describe("validateOutput", () => {
  beforeEach(() => {
    outputManifestMocks.validateOutputDirectory.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs success when validation passes for a given directory", async () => {
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([]);

    await runOutputValidation("/tmp/some-region", stubConfig);

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      "/tmp/some-region",
      stubConfig,
    );
    expect(console.log).toHaveBeenCalledWith(
      "Output validation passed for /tmp/some-region.",
    );
  });

  it("logs all issues and throws when validation fails", async () => {
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([
      "Missing required output file: townships.display.v1.geojson",
    ]);

    await expect(
      runOutputValidation("/tmp/custom-output", stubConfig),
    ).rejects.toThrow("Output validation failed for /tmp/custom-output.");

    expect(console.error).toHaveBeenNthCalledWith(
      1,
      "Missing required output file: townships.display.v1.geojson",
    );
  });

  it("validates every region directory that exists on disk and skips the rest", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "buffer-zones-validate-"));
    await mkdir(resolve(root, "gauteng"), { recursive: true });
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([]);

    await runAllRegionsOutputValidation(root);

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledTimes(
      1,
    );
    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      resolve(root, "gauteng"),
      GAUTENG_PIPELINE_CONFIG,
    );
  });

  it("throws when no region directory exists at all", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "buffer-zones-validate-"));
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([]);

    await expect(runAllRegionsOutputValidation(root)).rejects.toThrow(
      /No region output directories found/,
    );
    expect(outputManifestMocks.validateOutputDirectory).not.toHaveBeenCalled();
  });

  it("fails closed only for a region with an on-disk directory but no matching pipeline config, without aborting the other regions", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "buffer-zones-validate-"));
    await mkdir(resolve(root, "gauteng"), { recursive: true });
    await mkdir(resolve(root, "not-yet-built"), { recursive: true });
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([]);

    await expect(runAllRegionsOutputValidation(root)).rejects.toThrow(
      /not-yet-built/,
    );

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledTimes(
      1,
    );
    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      resolve(root, "gauteng"),
      GAUTENG_PIPELINE_CONFIG,
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("not-yet-built"),
    );
  });
});
