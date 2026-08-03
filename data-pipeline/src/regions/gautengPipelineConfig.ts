import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { METROS, type TransitLayerFeatureCollection } from "@stratum/app";
import {
  fetchAReYengRoutes,
  normalizeAReYeng,
  normalizeAReYengOverpass,
} from "../adapters/aReYeng";
import {
  fetchEkurhuleniIrptnRoutes,
  normalizeEkurhuleniIrptn,
} from "../adapters/ekurhuleniIrptn";
import {
  fetchGautrainBusRoutes,
  fetchGautrainRail,
  normalizeGautrainBusOverpass,
  normalizeGautrainOverpass,
} from "../adapters/gautrain";
import { fetchPrasaRail, normalizePrasaOverpass } from "../adapters/prasa";
import {
  fetchReaVayaRoutes,
  normalizeReaVayaOverpass,
} from "../adapters/reaVaya";
import {
  fetchTshwaneBusRoutes,
  normalizeTshwaneBusOverpass,
} from "../adapters/tshwaneBus";
import { getMetroBbox, getSharedTransitBbox } from "../constants/metroBbox";
import type { PipelineSource, RegionPipelineConfig } from "../pipelineSource";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, "../../../packages/web/public/data");

const REGION_ID = "gauteng";

const gautengMetros = METROS.filter((metro) => metro.regionId === REGION_ID);
const gautengMetroIds = gautengMetros.map((metro) => metro.id);

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readExistingTransitLayer(
  layerName: string,
): Promise<TransitLayerFeatureCollection | null> {
  const publishedOutputDir = resolve(OUTPUT_ROOT, REGION_ID);
  const candidates = [
    resolve(publishedOutputDir, `${layerName}.display.v1.geojson`),
    resolve(publishedOutputDir, `${layerName}.v1.geojson`),
  ];

  for (const filePath of candidates) {
    if (!(await pathExists(filePath))) {
      continue;
    }
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as TransitLayerFeatureCollection;
      if (Array.isArray(parsed.features) && parsed.features.length > 0) {
        return parsed;
      }
    } catch {}
  }

  return null;
}

function mergeFeatureCollections(
  collections: readonly TransitLayerFeatureCollection[],
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];
  for (const collection of collections) {
    features.push(...collection.features);
  }
  return { type: "FeatureCollection", features };
}

async function fetchRapidRail(): Promise<TransitLayerFeatureCollection> {
  const bbox = getSharedTransitBbox(gautengMetroIds);
  try {
    const raw = await fetchGautrainRail(bbox);
    return normalizeGautrainOverpass(raw);
  } catch (error) {
    console.error(
      "Skipping Gautrain rail due to fetch failure, falling back to last published output",
      error,
    );
    const fallback = await readExistingTransitLayer("rapid-rail");
    if (!fallback) {
      throw new Error(
        "Failed to fetch Gautrain rail and no fallback output exists",
      );
    }
    return fallback;
  }
}

async function fetchCommuterRail(): Promise<TransitLayerFeatureCollection> {
  const bbox = getSharedTransitBbox(gautengMetroIds);
  try {
    const raw = await fetchPrasaRail(bbox);
    return normalizePrasaOverpass(raw);
  } catch (error) {
    console.error(
      "Skipping PRASA rail due to fetch failure, falling back to last published output",
      error,
    );
    const fallback = await readExistingTransitLayer("commuter-rail");
    if (!fallback) {
      throw new Error(
        "Failed to fetch PRASA rail and no fallback output exists",
      );
    }
    return fallback;
  }
}

async function fetchBusRapidTransit(): Promise<TransitLayerFeatureCollection> {
  const rawAReYeng = await fetchAReYengRoutes();
  const aReYeng =
    "elements" in rawAReYeng
      ? normalizeAReYengOverpass(rawAReYeng)
      : normalizeAReYeng(rawAReYeng);

  const reaVayaBbox = getMetroBbox("johannesburg");
  const reaVayaRaw = await fetchReaVayaRoutes(reaVayaBbox);
  const reaVaya = normalizeReaVayaOverpass(reaVayaRaw);

  const ekurhuleniIrptnRaw = await fetchEkurhuleniIrptnRoutes();
  const ekurhuleniIrptn = normalizeEkurhuleniIrptn(ekurhuleniIrptnRaw);

  return mergeFeatureCollections([aReYeng, reaVaya, ekurhuleniIrptn]);
}

async function fetchGautrainBus(): Promise<TransitLayerFeatureCollection> {
  const bbox = getSharedTransitBbox(gautengMetroIds);
  try {
    const raw = await fetchGautrainBusRoutes(bbox);
    return normalizeGautrainBusOverpass(raw);
  } catch (error) {
    console.error(
      "Skipping Gautrain Bus due to fetch failure, falling back to last published output",
      error,
    );
    const fallback = await readExistingTransitLayer("bus");
    if (!fallback) {
      throw new Error(
        "Failed to fetch Gautrain Bus and no fallback output exists",
      );
    }
    const gautrainBus: TransitLayerFeatureCollection = {
      type: "FeatureCollection",
      features: fallback.features.filter(
        (feature) =>
          (feature.properties as { network?: unknown } | null)?.network ===
          "Gautrain Bus",
      ),
    };
    if (gautrainBus.features.length === 0) {
      throw new Error("Failed to recover Gautrain Bus from fallback output");
    }
    return gautrainBus;
  }
}

async function fetchBus(): Promise<TransitLayerFeatureCollection> {
  const [gautrainBus, tshwaneBusRaw] = await Promise.all([
    fetchGautrainBus(),
    fetchTshwaneBusRoutes(getMetroBbox("tshwane")),
  ]);
  const tshwaneBus = normalizeTshwaneBusOverpass(tshwaneBusRaw);
  return mergeFeatureCollections([gautrainBus, tshwaneBus]);
}

const sources: PipelineSource[] = [
  {
    layerId: "rapid-rail",
    regionId: REGION_ID,
    fetch: fetchRapidRail,
    outputFileName: "rapid-rail.display.v1.geojson",
  },
  {
    layerId: "commuter-rail",
    regionId: REGION_ID,
    fetch: fetchCommuterRail,
    outputFileName: "commuter-rail.display.v1.geojson",
  },
  {
    layerId: "bus-rapid-transit",
    regionId: REGION_ID,
    fetch: fetchBusRapidTransit,
    outputFileName: "bus-rapid-transit.display.v1.geojson",
  },
  {
    layerId: "bus",
    regionId: REGION_ID,
    fetch: fetchBus,
    outputFileName: "bus.display.v1.geojson",
  },
];

/**
 * The `gauteng` region's pipeline config: its nine metros, and one
 * `PipelineSource` per transit network (Gautrain rail/bus, PRASA rail,
 * A Re Yeng, Rea Vaya, Ekurhuleni IRPTN, Tshwane bus, and the combined
 * `bus-rapid-transit` layer merging A Re Yeng/Rea Vaya/Ekurhuleni IRPTN).
 * Registered in `REGION_PIPELINE_CONFIGS` (`../regionPipelineConfigs.ts`).
 */
export const GAUTENG_PIPELINE_CONFIG: RegionPipelineConfig = {
  regionId: REGION_ID,
  metros: gautengMetros,
  sources,
};
