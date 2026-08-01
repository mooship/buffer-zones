import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildOutputLayerRules,
  buildOutputManifest,
  REQUIRED_TRANSIT_NETWORKS,
  validateOutputDirectory,
} from "./outputManifest";
import { GAUTENG_PIPELINE_CONFIG } from "./regions/gautengPipelineConfig";

const OUTPUT_LAYER_RULES = buildOutputLayerRules(GAUTENG_PIPELINE_CONFIG);

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
  it("fails validation when the manifest file is missing", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-manifest-"));
    await mkdir(dir, { recursive: true });

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("Missing or unreadable manifest");
  });

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
      GAUTENG_PIPELINE_CONFIG,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

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
      GAUTENG_PIPELINE_CONFIG,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

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
      GAUTENG_PIPELINE_CONFIG,
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

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

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

  it("fails validation when an output file has invalid JSON", async () => {
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
      GAUTENG_PIPELINE_CONFIG,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(manifest, null, 2),
    );

    const firstFile = OUTPUT_LAYER_RULES[0]?.fileName;
    if (!firstFile) {
      throw new Error("Expected at least one output layer rule");
    }
    await writeFile(resolve(dir, firstFile), "not-json");

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

    expect(issues).toContain(`Invalid GeoJSON JSON content: ${firstFile}`);
  });

  it("fails validation when the manifest is missing a file entry", async () => {
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
      GAUTENG_PIPELINE_CONFIG,
    );

    const firstFile = OUTPUT_LAYER_RULES[0]?.fileName;
    if (!firstFile) {
      throw new Error("Expected at least one output layer rule");
    }

    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify(
        {
          ...manifest,
          files: manifest.files.filter((entry) => entry.fileName !== firstFile),
        },
        null,
        2,
      ),
    );

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

    expect(issues).toContain(`Manifest missing file entry for ${firstFile}`);
  });

  it("fails validation when manifest version is unsupported", async () => {
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
      GAUTENG_PIPELINE_CONFIG,
    );
    await writeFile(
      resolve(dir, "manifest.v1.json"),
      JSON.stringify({ ...manifest, version: 2 }, null, 2),
    );

    const issues = await validateOutputDirectory(dir, GAUTENG_PIPELINE_CONFIG);

    expect(issues).toContain("Unsupported manifest version: 2");
  });

  it("derives one output rule per configured source, plus the fixed township rules", () => {
    const rules = buildOutputLayerRules(GAUTENG_PIPELINE_CONFIG);
    expect(rules.map((r) => r.fileName).sort()).toEqual(
      [
        "townships.display.v1.geojson",
        "township-areas.display.v1.geojson",
        "rapid-rail.display.v1.geojson",
        "commuter-rail.display.v1.geojson",
        "bus-rapid-transit.display.v1.geojson",
        "bus.display.v1.geojson",
      ].sort(),
    );
  });
});
