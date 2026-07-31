# Stratum Plan C: Data Pipeline Orchestration Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove literal metro-id branching from `data-pipeline/src/run.ts`'s orchestration by introducing a `PipelineSource`/`RegionPipelineConfig` registry, so a new region/domain can be added by registering a config object, touching zero lines in `run.ts`. Derive `outputManifest.ts`'s `REQUIRED_TRANSIT_NETWORKS`/`OUTPUT_LAYER_RULES` from that same config instead of maintaining them as separate hardcoded lists.

**Architecture:** The per-metro branching that decides which transit-operator adapter(s) feed a given output layer (today `if (metro.id === "tshwane") { ... }` etc. at `run.ts:361-406`) moves into a Gauteng-specific `RegionPipelineConfig.sources` array, each entry a named async `fetch()` that internally does whatever per-metro branching that specific layer's data requires. Generic mechanics that already apply uniformly across all 9 metros (boundary fetch/normalize, OSRM job-center routing, the township join) are untouched — they were never metro-id-branched to begin with.

**Tech Stack:** Node.js, TypeScript, Vitest, `tsx` (standalone project, not an npm workspace).

## Global Constraints

- Plan A must be merged first (this plan does not strictly require Plan A's types, since `data-pipeline` doesn't import `packages/shared`'s new `Layer`/`LayerGroup` types directly — but it should run after Plan A/B land so `layerId` values used here match the ids Plan B's `registry.ts` serves).
- TDD: write the failing test before implementation code.
- No code comments unless capturing a genuinely non-obvious *why*.
- Biome `useBlockStatements: error` — brace every `if`.
- **Byte-for-byte output preservation is NOT required** (confirmed during design) — but the *set* of features written to each output file, and which transit networks feed which file, must not silently change. Every relocation of adapter-selection logic must preserve the exact current metro→network→layer mapping; when in doubt, read the current `run.ts:211-406` before moving logic, don't guess at it.
- `data-pipeline` has no pre-commit hook coverage from the root `lefthook` config beyond whatever `cd data-pipeline && npm run test` covers — run that explicitly after each task since it won't run automatically from the repo root.

---

### Task 1: Define `PipelineSource`/`RegionPipelineConfig` types

**Files:**
- Create: `data-pipeline/src/pipelineSource.ts`
- Test: `data-pipeline/src/pipelineSource.test.ts`

**Interfaces:**
- Produces: `PipelineSource { layerId: string; regionId: string; fetch(): Promise<FeatureCollection>; outputFileName: string }`, `RegionPipelineConfig { regionId: string; metros: MetroDefinition[]; sources: PipelineSource[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// data-pipeline/src/pipelineSource.test.ts
import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import type { PipelineSource, RegionPipelineConfig } from "./pipelineSource";

describe("PipelineSource/RegionPipelineConfig", () => {
  it("describes a named, fetchable output for a region", async () => {
    const emptyCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const source: PipelineSource = {
      layerId: "example",
      regionId: "gauteng",
      fetch: async () => emptyCollection,
      outputFileName: "example.display.v1.geojson",
    };
    await expect(source.fetch()).resolves.toEqual(emptyCollection);
  });

  it("groups sources and metros under one region config", () => {
    const config: RegionPipelineConfig = {
      regionId: "gauteng",
      metros: [],
      sources: [],
    };
    expect(config.regionId).toBe("gauteng");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/pipelineSource.test.ts`
Expected: FAIL — `Cannot find module './pipelineSource'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// data-pipeline/src/pipelineSource.ts
import type { MetroDefinition } from "@buffer-zones/shared";
import type { FeatureCollection } from "geojson";

export interface PipelineSource {
  layerId: string;
  regionId: string;
  fetch(): Promise<FeatureCollection>;
  outputFileName: string;
}

export interface RegionPipelineConfig {
  regionId: string;
  metros: MetroDefinition[];
  sources: PipelineSource[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/pipelineSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/pipelineSource.ts data-pipeline/src/pipelineSource.test.ts
git commit -m "feat(data-pipeline): add PipelineSource/RegionPipelineConfig types"
```

---

### Task 2: Extract Gauteng's transit-adapter selection into a `RegionPipelineConfig`

**Files:**
- Read (do not modify yet): `data-pipeline/src/run.ts:211-406` — the exact current per-network fetch/fallback logic (`fetchSharedTransit`) and per-metro branching (the `if (metro.id === "tshwane" | "johannesburg" | "ekurhuleni")` block) this task relocates.
- Create: `data-pipeline/src/regions/gautengPipelineConfig.ts`
- Test: `data-pipeline/src/regions/gautengPipelineConfig.test.ts`

**Interfaces:**
- Consumes: `PipelineSource`, `RegionPipelineConfig` (Task 1); the existing adapter modules `adapters/gautrain.ts`, `adapters/prasa.ts`, `adapters/aReYeng.ts`, `adapters/reaVaya.ts`, `adapters/ekurhuleniIrptn.ts`, `adapters/tshwaneBus.ts`; `METROS`/`getMetroDefinition` from `@buffer-zones/shared`.
- Produces: `GAUTENG_PIPELINE_CONFIG: RegionPipelineConfig` with 4 `sources` entries: `rapid-rail` (Gautrain rail), `commuter-rail` (PRASA), `bus-rapid-transit` (merges A Re Yeng + Rea Vaya + Ekurhuleni IRPTN, exactly as `run.ts`'s current per-metro branch does), `bus` (Tshwane municipal bus, plus Gautrain Bus per whatever the current `fetchSharedTransit` merge assigns it to — verify against the read-only step above and preserve that assignment exactly).

- [ ] **Step 1: Read the current logic being relocated**

Open `data-pipeline/src/run.ts` and note exactly: (a) what `fetchSharedTransit(regionId, metroIds)` returns and how its 3 fields (`gautrain`, `gautrainBus`, `prasa`) get merged into which final output layer today; (b) exactly which adapter each of the 3 branched metro ids (`tshwane`, `johannesburg`, `ekurhuleni`) invokes, and which final output layer(s) each contributes to. This mapping must be preserved exactly in Step 3.

- [ ] **Step 2: Write the failing test**

```ts
// data-pipeline/src/regions/gautengPipelineConfig.test.ts
import { describe, expect, it } from "vitest";
import { GAUTENG_PIPELINE_CONFIG } from "./gautengPipelineConfig";

describe("GAUTENG_PIPELINE_CONFIG", () => {
  it("has one source per current output transit layer", () => {
    expect(GAUTENG_PIPELINE_CONFIG.regionId).toBe("gauteng");
    expect(GAUTENG_PIPELINE_CONFIG.sources.map((s) => s.layerId).sort()).toEqual([
      "bus",
      "bus-rapid-transit",
      "commuter-rail",
      "rapid-rail",
    ]);
  });

  it("maps each source to the same output filename run.ts writes today", () => {
    const byLayerId = Object.fromEntries(
      GAUTENG_PIPELINE_CONFIG.sources.map((s) => [s.layerId, s.outputFileName]),
    );
    expect(byLayerId["rapid-rail"]).toBe("rapid-rail.display.v1.geojson");
    expect(byLayerId["commuter-rail"]).toBe("commuter-rail.display.v1.geojson");
    expect(byLayerId["bus-rapid-transit"]).toBe(
      "bus-rapid-transit.display.v1.geojson",
    );
    expect(byLayerId.bus).toBe("bus.display.v1.geojson");
  });

  it("includes all 9 Gauteng metros", () => {
    expect(GAUTENG_PIPELINE_CONFIG.metros).toHaveLength(9);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/regions/gautengPipelineConfig.test.ts`
Expected: FAIL — `Cannot find module './gautengPipelineConfig'`.

- [ ] **Step 4: Write the implementation, preserving Step 1's exact mapping**

```ts
// data-pipeline/src/regions/gautengPipelineConfig.ts
import { METROS } from "@buffer-zones/shared";
import { fetchAReYeng } from "../adapters/aReYeng";
import { fetchEkurhuleniIrptn } from "../adapters/ekurhuleniIrptn";
import { fetchGautrain } from "../adapters/gautrain";
import { fetchPrasa } from "../adapters/prasa";
import { fetchReaVaya } from "../adapters/reaVaya";
import { fetchTshwaneBus } from "../adapters/tshwaneBus";
import type { PipelineSource, RegionPipelineConfig } from "../pipelineSource";
import { mergeFeatureCollections } from "../mergeFeatureCollections";

const gautengMetros = METROS.filter((metro) => metro.regionId === "gauteng");

async function fetchBusRapidTransit() {
  const [aReYeng, reaVaya, ekurhuleniIrptn] = await Promise.all([
    fetchAReYeng(),
    fetchReaVaya(),
    fetchEkurhuleniIrptn(),
  ]);
  return mergeFeatureCollections([aReYeng, reaVaya, ekurhuleniIrptn]);
}

const sources: PipelineSource[] = [
  {
    layerId: "rapid-rail",
    regionId: "gauteng",
    fetch: fetchGautrain,
    outputFileName: "rapid-rail.display.v1.geojson",
  },
  {
    layerId: "commuter-rail",
    regionId: "gauteng",
    fetch: fetchPrasa,
    outputFileName: "commuter-rail.display.v1.geojson",
  },
  {
    layerId: "bus-rapid-transit",
    regionId: "gauteng",
    fetch: fetchBusRapidTransit,
    outputFileName: "bus-rapid-transit.display.v1.geojson",
  },
  {
    layerId: "bus",
    regionId: "gauteng",
    fetch: fetchTshwaneBus,
    outputFileName: "bus.display.v1.geojson",
  },
];

export const GAUTENG_PIPELINE_CONFIG: RegionPipelineConfig = {
  regionId: "gauteng",
  metros: gautengMetros,
  sources,
};
```

Adjust function names (`fetchAReYeng`, `fetchGautrain`, etc.) and the Gautrain Bus / fallback-on-error handling to match whatever Step 1 actually found — the snippet above is the target shape, not a guaranteed match for every adapter's exported name. If `fetchSharedTransit`'s existing fallback-to-cached-file behaviour on fetch failure is load-bearing (it is, per the investigation notes), preserve it inside each of these `fetch` wrappers rather than dropping it.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/regions/gautengPipelineConfig.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data-pipeline/src/regions/gautengPipelineConfig.ts data-pipeline/src/regions/gautengPipelineConfig.test.ts
git commit -m "feat(data-pipeline): extract Gauteng transit sources into a RegionPipelineConfig"
```

---

### Task 3: Make `run.ts` generic over `RegionPipelineConfig`

**Files:**
- Modify: `data-pipeline/src/run.ts`

**Interfaces:**
- Consumes: `GAUTENG_PIPELINE_CONFIG` (Task 2), `RegionPipelineConfig` (Task 1).
- Produces: `runRegion(config: RegionPipelineConfig)` — same external behaviour as today's `runRegion(regionId: string)`, now taking the config object directly instead of re-deriving metro/adapter choices from a literal region id string inside the function body.

This task has no dedicated new unit test — `run.ts` is an orchestration script exercised via the pipeline's existing manual/integration verification (`npm run run`), which requires live network access to Overpass/OSRM and is out of scope for automated CI. Verification here is a full read-through diff review plus `npm run typecheck`, not a new automated test.

- [ ] **Step 1: Replace the per-metro transit-adapter branch with the config's sources**

In `runRegion`, delete the `if (metro.id === "tshwane") { ... } else if (metro.id === "johannesburg") { ... } else if (metro.id === "ekurhuleni") { ... }` block (today at lines 361-406) entirely — that data now comes from `config.sources`, fetched once per region rather than per metro inside the metro loop, since (per Task 2) each source already fetches its full region-wide collection internally.

- [ ] **Step 2: Move the source-fetch + file-write loop outside the metro loop**

After the metro loop (boundary fetch, OSRM routing, township join — unchanged), add:

```ts
for (const source of config.sources) {
  const collection = await source.fetch();
  await writeGeoJson(outputDir, source.outputFileName, collection);
}
```

(Reuse whichever existing file-write helper `run.ts` already calls for the transit layers today — likely the same helper currently named something like `writeTransitLayer`; keep its name and signature, just change the call site to loop over `config.sources` instead of writing 4 hand-named files inline.)

- [ ] **Step 3: Change `runRegion`'s signature and its callers**

```ts
export async function runRegion(config: RegionPipelineConfig): Promise<void> {
  // ... existing body, minus Steps 1-2's relocated logic
}

const REGION_PIPELINE_CONFIGS: RegionPipelineConfig[] = [GAUTENG_PIPELINE_CONFIG];

export async function runAllProvinceRegions(): Promise<void> {
  for (const config of REGION_PIPELINE_CONFIGS) {
    await runRegion(config);
  }
}
```

Update the CLI `--region <id>` argument handling at the bottom of the file to look up the matching config from `REGION_PIPELINE_CONFIGS` by `regionId` and pass the config object to `runRegion`, rather than passing the raw id string through.

- [ ] **Step 4: Run typecheck**

Run: `cd data-pipeline && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Run the full data-pipeline test suite**

Run: `cd data-pipeline && npm run test`
Expected: PASS — no test in this project directly exercises `runRegion`'s internals per the investigation notes, so this should be unaffected; if any test does reference `runRegion(regionId: string)` by the old signature, update it to pass `GAUTENG_PIPELINE_CONFIG` instead.

- [ ] **Step 6: Commit**

```bash
git add data-pipeline/src/run.ts
git commit -m "refactor(data-pipeline): make run.ts generic over RegionPipelineConfig"
```

---

### Task 4: Derive `outputManifest.ts`'s hardcoded lists from the region config

**Files:**
- Modify: `data-pipeline/src/outputManifest.ts`, `data-pipeline/src/outputManifest.test.ts`

**Interfaces:**
- Consumes: `RegionPipelineConfig.sources` (Task 1/2).
- Produces: `buildOutputLayerRules(config: RegionPipelineConfig): OutputLayerRule[]` replacing the hardcoded `OUTPUT_LAYER_RULES` constant for transit layers (the two township files stay as fixed rules, since they're produced by the join step, not a `PipelineSource`). `REQUIRED_TRANSIT_NETWORKS` stays as a manually-curated list for now (network names aren't 1:1 with `layerId`s — a single source can carry multiple named networks, e.g. `bus-rapid-transit` carries 3) — deriving it fully is out of scope for this plan; only the file-rule list moves to config-driven.

- [ ] **Step 1: Write the failing test**

Add to `outputManifest.test.ts`:

```ts
import { GAUTENG_PIPELINE_CONFIG } from "./regions/gautengPipelineConfig";
import { buildOutputLayerRules } from "./outputManifest";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/outputManifest.test.ts`
Expected: FAIL — `buildOutputLayerRules` not exported.

- [ ] **Step 3: Implement**

In `outputManifest.ts`, keep the two fixed township `OutputLayerRule` entries as a local constant, then add:

```ts
import type { RegionPipelineConfig } from "./pipelineSource";

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
```

Update every call site currently reading the module-level `OUTPUT_LAYER_RULES` constant (in `run.ts`'s validation step and anywhere else it's imported) to call `buildOutputLayerRules(config)` instead, passing whichever `RegionPipelineConfig` is active for that run. Keep exporting `OUTPUT_LAYER_RULES` as `TOWNSHIP_OUTPUT_RULES` only if something outside this file still imports the old name directly — check with `grep -rn "OUTPUT_LAYER_RULES" data-pipeline/src` and update those call sites instead of preserving a stale export.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/outputManifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full data-pipeline suite**

Run: `cd data-pipeline && npm run test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data-pipeline/src/outputManifest.ts data-pipeline/src/outputManifest.test.ts data-pipeline/src/run.ts
git commit -m "feat(data-pipeline): derive output layer rules from RegionPipelineConfig"
```

---

## Plan C self-review notes

- **Spec coverage:** §5 ingestion pipeline proposal — `PipelineSource`/`RegionPipelineConfig` (Task 1), generic `run.ts` loop (Task 3), config-derived manifest rules (Task 4). The `join` hook mentioned in the spec's `RegionPipelineConfig` example was found, on investigation, to be unconditional (all 9 metros always run the same boundary/OSRM/join steps — only the transit-operator selection was metro-id-branched), so it's intentionally omitted here rather than added as unused surface — YAGNI.
- **Scope note:** `REQUIRED_TRANSIT_NETWORKS` is explicitly left as a manually-curated constant (Task 4) since networks and `layerId`s aren't 1:1 (one source can carry several named networks); fully deriving it would require each `PipelineSource` to declare its constituent network names, which isn't needed by anything in scope here — flagged rather than silently done.
- **Manual verification required:** Task 3 changes the pipeline orchestrator but cannot be exercised end-to-end in CI (requires live Overpass/OSRM network access) — flag to the user that a manual `cd data-pipeline && npm run run -- --region gauteng` should be run against a real network connection before trusting the regenerated output, before this is relied upon for a production deploy.
