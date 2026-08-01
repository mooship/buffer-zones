import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FeatureCollection } from "geojson";
import type { RegionPipelineConfig } from "./pipelineSource";

export interface OutputLayerRule {
  fileName: string;
  minFeatures: number;
}

const TOWNSHIP_OUTPUT_RULES: readonly OutputLayerRule[] = [
  { fileName: "townships.display.v1.geojson", minFeatures: 1 },
  { fileName: "township-areas.display.v1.geojson", minFeatures: 1 },
];

export function buildOutputLayerRules(
  config: RegionPipelineConfig,
): OutputLayerRule[] {
  return [
    ...TOWNSHIP_OUTPUT_RULES,
    ...config.sources.map((source) => ({
      fileName: source.outputFileName,
      minFeatures: 1,
    })),
  ];
}

export const REQUIRED_TRANSIT_NETWORKS = [
  "Gautrain",
  "PRASA",
  "Gautrain Bus",
  "A Re Yeng",
  "Rea Vaya",
  "Tshwane Bus Services",
] as const;

export interface OutputFileManifestEntry {
  fileName: string;
  featureCount: number;
  sha256: string;
  bytes: number;
}

export interface OutputManifest {
  version: 1;
  generatedAt: string;
  metroIds: string[];
  files: OutputFileManifestEntry[];
  networkCoverage: Record<string, number>;
}

function digest(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function countTransitNetworks(
  collection: FeatureCollection,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const feature of collection.features) {
    const network =
      (feature.properties as { network?: unknown } | null)?.network ?? null;
    if (typeof network !== "string" || network.length === 0) {
      continue;
    }
    counts[network] = (counts[network] ?? 0) + 1;
  }
  return counts;
}

export async function buildOutputManifest(
  outputDir: string,
  metroIds: string[],
  networkCoverage: Record<string, number>,
  config: RegionPipelineConfig,
): Promise<OutputManifest> {
  const files: OutputFileManifestEntry[] = [];

  for (const rule of buildOutputLayerRules(config)) {
    const fullPath = resolve(outputDir, rule.fileName);
    const raw = await readFile(fullPath);
    const parsed = JSON.parse(raw.toString("utf8")) as FeatureCollection;
    const featureCount = Array.isArray(parsed.features)
      ? parsed.features.length
      : 0;
    files.push({
      fileName: rule.fileName,
      featureCount,
      sha256: digest(raw),
      bytes: raw.length,
    });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    metroIds,
    files,
    networkCoverage,
  };
}

export async function validateOutputDirectory(
  outputDir: string,
  config: RegionPipelineConfig,
): Promise<string[]> {
  const issues: string[] = [];
  const manifestPath = resolve(outputDir, "manifest.v1.json");

  let manifest: OutputManifest;
  try {
    manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as OutputManifest;
  } catch {
    return [`Missing or unreadable manifest: ${manifestPath}`];
  }

  if (manifest.version !== 1) {
    issues.push(`Unsupported manifest version: ${manifest.version}`);
  }

  for (const rule of buildOutputLayerRules(config)) {
    const fullPath = resolve(outputDir, rule.fileName);
    let raw: Buffer;
    try {
      raw = await readFile(fullPath);
    } catch {
      issues.push(`Missing required output file: ${rule.fileName}`);
      continue;
    }

    let featureCount = 0;
    try {
      const parsed = JSON.parse(raw.toString("utf8")) as FeatureCollection;
      featureCount = Array.isArray(parsed.features)
        ? parsed.features.length
        : 0;
    } catch {
      issues.push(`Invalid GeoJSON JSON content: ${rule.fileName}`);
      continue;
    }

    if (featureCount < rule.minFeatures) {
      issues.push(
        `Feature count below threshold for ${rule.fileName}: ${featureCount} < ${rule.minFeatures}`,
      );
    }

    const manifestEntry = manifest.files.find(
      (entry) => entry.fileName === rule.fileName,
    );
    if (!manifestEntry) {
      issues.push(`Manifest missing file entry for ${rule.fileName}`);
      continue;
    }

    const calculatedHash = digest(raw);
    if (manifestEntry.sha256 !== calculatedHash) {
      issues.push(`Checksum mismatch for ${rule.fileName}`);
    }

    if (manifestEntry.featureCount !== featureCount) {
      issues.push(
        `Manifest feature count mismatch for ${rule.fileName}: manifest=${manifestEntry.featureCount}, actual=${featureCount}`,
      );
    }
  }

  for (const network of REQUIRED_TRANSIT_NETWORKS) {
    const count = manifest.networkCoverage[network] ?? 0;
    if (count < 1) {
      issues.push(`Missing required transit network coverage: ${network}`);
    }
  }

  return issues;
}
