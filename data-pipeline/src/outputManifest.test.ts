import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OUTPUT_LAYER_RULES,
  REQUIRED_TRANSIT_NETWORKS,
  buildOutputManifest,
  validateOutputDirectory,
} from "./outputManifest";

function collection(featureCount: number): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: Array.from({ length: featureCount }, (_, index) => ({
      type: "Feature",
      properties: { id: index, network: "Demo" },
      geometry: { type: "Point", coordinates: [28 + index * 0.001, -26] },
    })),
  });
}

describe("output manifest", () => {
  it("builds and validates a complete output directory", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-manifest-"));
    await mkdir(dir, { recursive: true });

    for (const rule of OUTPUT_LAYER_RULES) {
      await writeFile(
        resolve(dir, rule.fileName),
        collection(Math.max(1, rule.minFeatures)),
      );
    }

    const networkCoverage = Object.fromEntries(
      REQUIRED_TRANSIT_NETWORKS.map((network) => [network, 2]),
    );
    const manifest = await buildOutputManifest(
      dir,
      ["tshwane", "johannesburg"],
      networkCoverage,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const issues = await validateOutputDirectory(dir);

    expect(issues).toEqual([]);
  });

  it("fails validation when required network coverage is missing", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-manifest-"));
    await mkdir(dir, { recursive: true });

    for (const rule of OUTPUT_LAYER_RULES) {
      await writeFile(
        resolve(dir, rule.fileName),
        collection(Math.max(1, rule.minFeatures)),
      );
    }

    const networkCoverage = Object.fromEntries(
      REQUIRED_TRANSIT_NETWORKS.map((network) => [network, 2]),
    );
    networkCoverage.Gautrain = 0;

    const manifest = await buildOutputManifest(
      dir,
      ["tshwane", "johannesburg"],
      networkCoverage,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const issues = await validateOutputDirectory(dir);

    expect(issues).toContain(
      "Missing required transit network coverage: Gautrain",
    );
  });

  it("fails validation when a manifest checksum is stale", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-manifest-"));
    await mkdir(dir, { recursive: true });

    for (const rule of OUTPUT_LAYER_RULES) {
      await writeFile(
        resolve(dir, rule.fileName),
        collection(Math.max(1, rule.minFeatures)),
      );
    }

    const networkCoverage = Object.fromEntries(
      REQUIRED_TRANSIT_NETWORKS.map((network) => [network, 2]),
    );
    const manifest = await buildOutputManifest(
      dir,
      ["tshwane", "johannesburg"],
      networkCoverage,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const firstFile = OUTPUT_LAYER_RULES[0]?.fileName;
    if (!firstFile) {
      throw new Error("Expected at least one output layer rule");
    }

    await writeFile(resolve(dir, firstFile), collection(5));

    const issues = await validateOutputDirectory(dir);

    expect(
      issues.some((issue) =>
        issue.includes(`Checksum mismatch for ${firstFile}`),
      ),
    ).toBe(true);

    const manifestRaw = await readFile(
      resolve(dir, "manifest.v1.json"),
      "utf8",
    );
    expect(manifestRaw.length).toBeGreaterThan(0);
  });
});
