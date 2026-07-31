# Regional data split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded `/data/national/` output with a `REGIONS`-driven model so each province (or future national/custom-scoped dataset) has its own independently-buildable output directory, while the web app still renders everything merged into one map.

**Architecture:** Add a `REGIONS` registry to `packages/shared` (id + kind: `province`/`national`/`custom`). `data-pipeline` gains a `runRegion(regionId)` that builds one region's directory (metros filtered by `regionId`), replacing the old single `runNational()`. The web app's layer registry and township fetching build one URL per region (currently just `gauteng`) and merge the resulting `FeatureCollection`s client-side — no new UI.

**Tech Stack:** TypeScript, vitest, Node fs/promises (pipeline), React (web), existing GeoJSON schema validation (`fetchFeatureCollection`).

## Global Constraints

- TDD: write the failing test before implementation code, for every step below.
- No code comments except non-obvious *why* comments (per CLAUDE.md) — do not add any in this work.
- British English in user-facing copy — no user-facing copy changes in this plan, so N/A, but don't introduce any American spellings if you add strings.
- Biome `useBlockStatements: error` — always use braces on `if`, never single-line conditionals.
- This is a **Gauteng-only reorg**: do not add a second real province's data. Only the `gauteng` region exists in `REGIONS` after this plan. The architecture must support more being added later without further code changes.
- No new layer types, no region-picker UI — every region's layers are merged into one combined map view.
- Run `npm run test`, `npm run typecheck`, and `npm run lint` (and `cd data-pipeline && npm run test && npm run typecheck`) before every commit that touches their respective workspace.

---

### Task 1: Add `REGIONS` to `packages/shared`

**Files:**
- Create: `packages/shared/src/constants/regions.ts`
- Create: `packages/shared/src/constants/regions.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `RegionKind` (`"province" | "national" | "custom"`), `RegionDefinition { id: string; label: string; kind: RegionKind }`, `REGIONS: readonly RegionDefinition[]`, `getRegionDefinition(id: string): RegionDefinition | undefined`. Later tasks import all of these from `@buffer-zones/shared`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/constants/regions.test.ts
import { describe, expect, it } from "vitest";
import { REGIONS, getRegionDefinition } from "./regions";

describe("regions", () => {
  it("defines the gauteng province region", () => {
    expect(REGIONS).toEqual([
      { id: "gauteng", label: "Gauteng", kind: "province" },
    ]);
  });

  it("looks up a region by id", () => {
    expect(getRegionDefinition("gauteng")?.label).toBe("Gauteng");
    expect(getRegionDefinition("not-a-real-region")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/constants/regions.test.ts`
Expected: FAIL — cannot find module `./regions`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/constants/regions.ts
export type RegionKind = "province" | "national" | "custom";

export interface RegionDefinition {
  id: string;
  label: string;
  kind: RegionKind;
}

export const REGIONS: readonly RegionDefinition[] = [
  { id: "gauteng", label: "Gauteng", kind: "province" },
] as const satisfies readonly RegionDefinition[];

export function getRegionDefinition(id: string): RegionDefinition | undefined {
  return REGIONS.find((region) => region.id === id);
}
```

Add to `packages/shared/src/index.ts`:

```ts
export * from "./constants/regions";
```

(insert alongside the other `export * from "./constants/..."` lines)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/constants/regions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/regions.ts packages/shared/src/constants/regions.test.ts packages/shared/src/index.ts
git commit -m "Add REGIONS registry to packages/shared"
```

---

### Task 2: Add `regionId` to `METROS`

**Files:**
- Modify: `packages/shared/src/constants/metros.ts`
- Modify: `packages/shared/src/constants/metros.test.ts`

**Interfaces:**
- Consumes: nothing new (this task doesn't need to import `REGIONS` — `regionId` is just a plain string field validated against known values in tests, avoiding a circular/needless coupling).
- Produces: `MetroDefinition.regionId: string`, set to `"gauteng"` for all 9 entries. `data-pipeline/src/run.ts` (Task 6) filters `METROS` by this field.

- [ ] **Step 1: Write the failing test**

Add to `packages/shared/src/constants/metros.test.ts` (inside the existing `describe("metros", ...)` block):

```ts
  it("assigns every metro to the gauteng region", () => {
    for (const metro of METROS) {
      expect(metro.regionId).toBe("gauteng");
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/constants/metros.test.ts`
Expected: FAIL — `metro.regionId` is `undefined`, not `"gauteng"`.

- [ ] **Step 3: Write minimal implementation**

In `packages/shared/src/constants/metros.ts`:

```ts
export interface MetroDefinition {
  id: MetroId;
  name: string;
  shortName: string;
  regionId: string;
  municipalityCodes: readonly number[];
  center: { lat: number; lon: number };
  zoom: number;
  jobCenterCount: number;
}
```

Add `regionId: "gauteng",` as the second field (after `id`) in every one of the 9 objects in the `METROS` array.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/constants/metros.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/metros.ts packages/shared/src/constants/metros.test.ts
git commit -m "Tag every metro with its region id"
```

---

### Task 3: `LayerDefinition.dataSource` becomes a list of URLs

**Files:**
- Modify: `packages/shared/src/types/layer.ts`
- Modify: `packages/shared/src/types/layer.test.ts`

**Interfaces:**
- Produces: `LayerDefinition.dataSource: readonly string[]` (was `string`). Task 5 (`registry.ts`) and Task 4 (`useLayerData.ts`) depend on this being an array.

- [ ] **Step 1: Write the failing test**

Replace the body of the existing test in `packages/shared/src/types/layer.test.ts`:

```ts
import { describe, expectTypeOf, it } from "vitest";
import type { LayerDefinition, LayerId, LayerType } from "./layer";

describe("LayerDefinition", () => {
  it("accepts a valid choropleth layer definition with a list of data sources", () => {
    const def: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
      dataSource: ["/data/gauteng/townships.v1.geojson"],
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
    };
    expectTypeOf(def.id).toEqualTypeOf<LayerId>();
    expectTypeOf(def.layerType).toEqualTypeOf<LayerType>();
    expectTypeOf(def.dataSource).toEqualTypeOf<readonly string[]>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/types/layer.test.ts`
Expected: FAIL (type error) — `dataSource` is currently typed `string`, an array literal won't satisfy it.

- [ ] **Step 3: Write minimal implementation**

In `packages/shared/src/types/layer.ts`, change:

```ts
export interface LayerDefinition {
  id: LayerId;
  label: string;
  dataSource: readonly string[];
  layerType: LayerType;
  defaultVisible: boolean;
  available: boolean;
  style?: LayerStyle;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/types/layer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/layer.ts packages/shared/src/types/layer.test.ts
git commit -m "Allow a layer definition to fetch from multiple region data sources"
```

---

### Task 4: Web helpers — `buildRegionDataUrls` and `mergeFeatureCollections`

**Files:**
- Create: `packages/web/src/data/regionDataUrls.ts`
- Create: `packages/web/src/data/regionDataUrls.test.ts`
- Create: `packages/web/src/data/mergeFeatureCollections.ts`
- Create: `packages/web/src/data/mergeFeatureCollections.test.ts`

**Interfaces:**
- Consumes: `REGIONS` from `@buffer-zones/shared` (Task 1).
- Produces: `buildRegionDataUrls(fileName: string): string[]` and `mergeFeatureCollections(collections: FeatureCollection[]): FeatureCollection`. Tasks 5, 6, and 7 use both.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/web/src/data/regionDataUrls.test.ts
import { describe, expect, it } from "vitest";
import { buildRegionDataUrls } from "./regionDataUrls";

describe("buildRegionDataUrls", () => {
  it("builds one URL per configured region", () => {
    expect(buildRegionDataUrls("townships.display.v1.geojson")).toEqual([
      "/data/gauteng/townships.display.v1.geojson",
    ]);
  });
});
```

```ts
// packages/web/src/data/mergeFeatureCollections.test.ts
import { describe, expect, it } from "vitest";
import { mergeFeatureCollections } from "./mergeFeatureCollections";

describe("mergeFeatureCollections", () => {
  it("concatenates features from every collection in order", () => {
    const a = {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: { id: 1 }, geometry: null }],
    };
    const b = {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: { id: 2 }, geometry: null }],
    };

    expect(mergeFeatureCollections([a, b])).toEqual({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { id: 1 }, geometry: null },
        { type: "Feature", properties: { id: 2 }, geometry: null },
      ],
    });
  });

  it("returns an empty collection when given no collections", () => {
    expect(mergeFeatureCollections([])).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/web/src/data/regionDataUrls.test.ts packages/web/src/data/mergeFeatureCollections.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/data/regionDataUrls.ts
import { REGIONS } from "@buffer-zones/shared";

export function buildRegionDataUrls(fileName: string): string[] {
  return REGIONS.map((region) => `/data/${region.id}/${fileName}`);
}
```

```ts
// packages/web/src/data/mergeFeatureCollections.ts
import type { Feature, FeatureCollection } from "geojson";

export function mergeFeatureCollections(
  collections: readonly FeatureCollection[],
): FeatureCollection {
  const features: Feature[] = [];
  for (const collection of collections) {
    features.push(...collection.features);
  }
  return { type: "FeatureCollection", features };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/web/src/data/regionDataUrls.test.ts packages/web/src/data/mergeFeatureCollections.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/data/regionDataUrls.ts packages/web/src/data/regionDataUrls.test.ts packages/web/src/data/mergeFeatureCollections.ts packages/web/src/data/mergeFeatureCollections.test.ts
git commit -m "Add region-aware data URL and feature-collection merge helpers"
```

---

### Task 5: `registry.ts` builds one `dataSource` URL per region

**Files:**
- Modify: `packages/web/src/layers/registry.ts`
- Modify: `packages/web/src/layers/registry.test.ts`

**Interfaces:**
- Consumes: `buildRegionDataUrls` (Task 4).
- Produces: `getLayerDefinitions()` / `getLayerDefinition(id)` unchanged in signature; `dataSource` on every returned definition is now `string[]` built via `buildRegionDataUrls`. Task 6 (`useLayerData.ts`) consumes `definition.dataSource` as an array.

- [ ] **Step 1: Write the failing test**

Replace the third test in `packages/web/src/layers/registry.test.ts`:

```ts
  it("points every layer's dataSource at .geojson files under /data/<region>/", () => {
    for (const layer of getLayerDefinitions()) {
      expect(layer.dataSource.length).toBeGreaterThan(0);
      for (const source of layer.dataSource) {
        expect(source).toMatch(/^\/data\/[\w-]+\/[\w.-]+\.geojson$/);
      }
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: FAIL — current `dataSource` is `/data/national/...`, doesn't match `/data/[\w-]+/...` region pattern (well, it would character-match, but the pre-existing `/^\/data\/national\/[\w.-]+\.geojson$/` test this replaces will fail to compile since `dataSource` is now an array — `toMatch` requires a string).

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/layers/registry.ts
import type { LayerDefinition, LayerId } from "@buffer-zones/shared";
import { TRANSIT_LINE_COLORS } from "../constants/layerStyles";
import { buildRegionDataUrls } from "../data/regionDataUrls";

const LAYER_DEFINITIONS: readonly LayerDefinition[] = [
  {
    id: "townships",
    label: "Modeled car time",
    dataSource: buildRegionDataUrls("townships.display.v1.geojson"),
    layerType: "choropleth",
    defaultVisible: true,
    available: true,
    style: { kind: "choropleth", propertyKey: "commuteMinutes" },
  },
  {
    id: "nearest-transit",
    label: "Distance to Nearest Transit",
    dataSource: buildRegionDataUrls("townships.display.v1.geojson"),
    layerType: "choropleth",
    defaultVisible: false,
    available: true,
    style: { kind: "choropleth", propertyKey: "nearestTransitKm" },
  },
  {
    id: "rapid-rail",
    label: "Rapid Rail",
    dataSource: buildRegionDataUrls("rapid-rail.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.rapidRail, weight: 3 },
  },
  {
    id: "bus-rapid-transit",
    label: "Bus Rapid Transit",
    dataSource: buildRegionDataUrls("bus-rapid-transit.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.busRapidTransit,
      weight: 3,
    },
  },
  {
    id: "commuter-rail",
    label: "Commuter Rail",
    dataSource: buildRegionDataUrls("commuter-rail.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.commuterRail,
      weight: 2,
    },
  },
  {
    id: "bus",
    label: "Bus",
    dataSource: buildRegionDataUrls("bus.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.bus,
      weight: 3,
    },
  },
];

export function getLayerDefinitions(): readonly LayerDefinition[] {
  return LAYER_DEFINITIONS;
}

export function getLayerDefinition(id: LayerId): LayerDefinition | undefined {
  return LAYER_DEFINITIONS.find((layer) => layer.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/layers/registry.ts packages/web/src/layers/registry.test.ts
git commit -m "Build layer dataSource URLs from REGIONS instead of a hardcoded national path"
```

---

### Task 6: `useLayerData` fetches and merges every region's URL per layer

**Files:**
- Modify: `packages/web/src/hooks/useLayerData.ts`
- Modify: `packages/web/src/hooks/useLayerData.test.ts`
- Modify: `packages/web/src/components/MapView/MapView.test.tsx:364-367`

**Interfaces:**
- Consumes: `mergeFeatureCollections` (Task 4), `LayerDefinition.dataSource: readonly string[]` (Task 3/5).
- Produces: `useLayerData(layerIds: LayerId[]): LayerDataMap` — same public signature and return shape as before (`Partial<Record<LayerId, FeatureCollection>>`); internally now fetches every URL in `dataSource` and merges. A layer only appears in the returned map once **all** its URLs have resolved (matching today's all-or-nothing-per-layer semantics, just extended across sources instead of one).

- [ ] **Step 1: Write the failing test**

Add to `packages/web/src/hooks/useLayerData.test.ts` (new `it` inside the `describe` block):

```ts
  it("merges features from every region source configured for a layer", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: { region: "a" }, geometry: null }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: { region: "b" }, geometry: null }],
        }),
      } as Response);

    vi.doMock("../layers/registry", () => ({
      getLayerDefinition: () => ({
        id: "townships",
        label: "Modeled car time",
        dataSource: ["/data/gauteng/townships.display.v1.geojson", "/data/other/townships.display.v1.geojson"],
        layerType: "choropleth",
        defaultVisible: true,
        available: true,
      }),
    }));
    vi.resetModules();
    const { useLayerData: useLayerDataWithTwoSources } = await import("./useLayerData");

    const { result } = renderHook(() =>
      useLayerDataWithTwoSources(["townships" as LayerId]),
    );

    await waitFor(() => {
      expect(result.current.townships?.features).toHaveLength(2);
    });
    vi.doUnmock("../layers/registry");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/hooks/useLayerData.test.ts`
Expected: FAIL — current implementation calls `fetchFeatureCollection(definition.dataSource, ...)` with an array where a string is expected, and doesn't merge multiple sources.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/hooks/useLayerData.ts
import type { LayerId } from "@buffer-zones/shared";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { mergeFeatureCollections } from "../data/mergeFeatureCollections";
import { getLayerDefinition } from "../layers/registry";

export type LayerDataMap = Partial<Record<LayerId, FeatureCollection>>;

export function useLayerData(layerIds: LayerId[]): LayerDataMap {
  const [data, setData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<string>());
  const key = layerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const controllers = new Map<string, AbortController>();

    const ids = key.length > 0 ? (key.split(",") as LayerId[]) : [];

    for (const id of ids) {
      const definition = getLayerDefinition(id);
      if (!definition?.available) {
        continue;
      }

      const requestKey = `${id}:${definition.dataSource.join(",")}`;
      if (requested.current.has(requestKey)) {
        continue;
      }

      requested.current.add(requestKey);
      const controller = new AbortController();
      controllers.set(requestKey, controller);

      Promise.all(
        definition.dataSource.map((source) =>
          fetchFeatureCollection(source, undefined, controller.signal),
        ),
      )
        .then((collections) => {
          if (!cancelled) {
            setData((current) => ({
              ...current,
              [id]: mergeFeatureCollections(collections),
            }));
          }
          controllers.delete(requestKey);
        })
        .catch(() => {
          requested.current.delete(requestKey);
          controllers.delete(requestKey);
        });
    }

    return () => {
      cancelled = true;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
  }, [key]);

  return data;
}
```

Update `packages/web/src/components/MapView/MapView.test.tsx:364-367` (the fetch-URL assertion) from:

```ts
    expect(fetch).toHaveBeenCalledWith(
      "/data/national/rapid-rail.display.v1.geojson",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
```

to:

```ts
    expect(fetch).toHaveBeenCalledWith(
      "/data/gauteng/rapid-rail.display.v1.geojson",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
```

Update the two `expect.stringContaining("/data/national/...")` assertions already in `useLayerData.test.ts` (lines 29 and 53) to `"/data/gauteng/..."` to match the renamed region.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/web/src/hooks/useLayerData.test.ts packages/web/src/components/MapView/MapView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useLayerData.ts packages/web/src/hooks/useLayerData.test.ts packages/web/src/components/MapView/MapView.test.tsx
git commit -m "Fetch and merge every region source for a layer in useLayerData"
```

---

### Task 7: `App.tsx` fetches townships/areas per region and merges

**Files:**
- Modify: `packages/web/src/App.tsx:102-127` (the data-loading `useEffect`)

**Interfaces:**
- Consumes: `buildRegionDataUrls`, `mergeFeatureCollections` (Task 4).
- Produces: no change to `App`'s public behaviour/props — `townships`/`townshipAreas` state ends up populated the same way, just sourced from every region instead of one hardcoded path.

- [ ] **Step 1: Write the failing test**

`App.test.tsx` mocks `createTownshipDataRepository` and `fetchFeatureCollection` directly (not real `fetch`), so no new assertion is needed to drive this change — the existing suite already exercises the data-loading effect end-to-end via those mocks and will catch a wiring mistake (e.g. an unhandled promise rejection or wrong merge). Confirm this by running the existing suite first:

Run: `npx vitest run packages/web/src/App.test.tsx`
Expected: PASS (baseline, before this task's change — establishes there's no regression risk hidden by a skipped test).

- [ ] **Step 2: N/A**

No new failing test to write for this task — proceed directly to the implementation, then re-run the existing suite in Step 4 as the acceptance check.

- [ ] **Step 3: Write minimal implementation**

In `packages/web/src/App.tsx`, add the imports:

```ts
import { buildRegionDataUrls } from "./data/regionDataUrls";
import { mergeFeatureCollections } from "./data/mergeFeatureCollections";
```

Replace the body of the data-loading `useEffect` (currently `packages/web/src/App.tsx:102-127`) with:

```tsx
  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    setTownships([]);
    setTownshipAreas([]);
    const cacheBust = loadAttempt > 0 ? `?retry=${loadAttempt}` : "";
    const townshipUrls = buildRegionDataUrls(
      `townships.display.v1.geojson${cacheBust}`,
    );
    const areaUrls = buildRegionDataUrls(
      `township-areas.display.v1.geojson${cacheBust}`,
    );

    Promise.all([
      Promise.all(
        townshipUrls.map((url) =>
          createTownshipDataRepository(url).getTownships(),
        ),
      ),
      Promise.all(areaUrls.map((url) => fetchFeatureCollection(url))),
    ])
      .then(([townshipsByRegion, areasByRegion]) => {
        if (!cancelled) {
          setTownships(townshipsByRegion.flat());
          setTownshipAreas(mergeFeatureCollections(areasByRegion).features);
        }
      })
      .catch(() => {
        if (!cancelled) {
```

(the remainder of the `.catch()` block and the effect's cleanup/dependency array are unchanged — only the body up to `.catch()` is replaced; re-read the surrounding lines before editing to preserve the existing error-handling and `return () => { cancelled = true; }` cleanup exactly as they are today).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "Load townships and township-areas from every configured region"
```

---

### Task 8: `data-pipeline` builds one directory per region

**Files:**
- Modify: `data-pipeline/src/run.ts`
- Modify: `data-pipeline/src/adapters/boundaries.test.ts` (comment only, optional — see step 3 note)

**Interfaces:**
- Consumes: `REGIONS` from `@buffer-zones/shared` (Task 1), `MetroDefinition.regionId` (Task 2).
- Produces: `runRegion(regionId: string): Promise<void>` (replaces `runNational`), writes to `packages/web/public/data/<regionId>/` instead of `packages/web/public/data/national/`. Script entry point at the bottom of the file now loops every `province`-kind region in `REGIONS` and calls `runRegion` for each — today that's just `gauteng`, so `npm run run` behaves identically to before except for the output directory name.

- [ ] **Step 1: Write the failing test**

`run.ts` has no existing unit test (it's a top-level script with real network/OSRM side effects) and this plan is explicitly a Gauteng-only reorg with no second region to build — there is nothing here to unit test in isolation without a substantial integration harness that's out of scope. Instead, verify this task via the **existing** `data-pipeline` test suite, which exercises the pure-transform helpers `run.ts` calls into:

Run: `cd data-pipeline && npm run test`
Expected: PASS (baseline, before this task's changes).

- [ ] **Step 2: N/A**

No new failing unit test — proceed to the implementation, then re-run the baseline suite in Step 4 as the acceptance check, plus a manual dry-run described below.

- [ ] **Step 3: Write minimal implementation**

In `data-pipeline/src/run.ts`, apply these targeted edits (keep everything else — the OSRM/boundary/transit-fetching logic — exactly as-is):

1. Add the import:

```ts
import { METROS, REGIONS, type TransitLayerFeatureCollection } from "@buffer-zones/shared";
```

2. Replace every literal `"national"` directory-name reference with a `regionId` parameter:

```ts
async function fetchSharedTransit(regionId: string): Promise<SharedTransit> {
  const bbox = getSharedTransitBbox();
  const publishedOutputDir = resolve(OUTPUT_ROOT, regionId);
  // ...unchanged body below this line...
```

```ts
async function cleanupStagingDirectories(rootDir: string, regionId: string): Promise<void> {
  const entries = await readdir(rootDir, {
    withFileTypes: true,
    encoding: "utf8",
  }).catch(() => {
    return [];
  });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name.startsWith(`${regionId}.__staging__`),
      )
      .map((entry) =>
        rm(resolve(rootDir, entry.name), { recursive: true, force: true }),
      ),
  );
}
```

3. Rename `runNational` to `runRegion` and parameterize it:

```ts
async function runRegion(regionId: string): Promise<void> {
  await pruneCache(7 * 24 * 60 * 60 * 1000);
  assertMetroSetup();
  await cleanupStagingDirectories(OUTPUT_ROOT, regionId);

  const metros = METROS.filter((metro) => metro.regionId === regionId);
  if (metros.length === 0) {
    throw new Error(`No metros configured for region: ${regionId}`);
  }

  const publishDir = resolve(OUTPUT_ROOT, regionId);
  const stagedDir = resolve(OUTPUT_ROOT, `${regionId}.__staging__${Date.now()}`);

  try {
    const outputDir = stagedDir;
    const sharedTransit = await fetchSharedTransit(regionId);

    // ...unchanged writeTransitLayer/allTownships/etc. setup...

    for (const metro of metros) {
      // ...unchanged loop body — replace every remaining `for (const metro of METROS)` with `for (const metro of metros)`...
    }

    // ...unchanged townships/township-areas/transit writing...

    const manifest = await buildOutputManifest(
      outputDir,
      metros.map((metro) => metro.id),
      networkCoverage,
    );
    await writeGeoJsonFile(resolve(outputDir, "manifest.v1.json"), manifest);

    const issues = await validateOutputDirectory(outputDir);
    if (issues.length > 0) {
      throw new Error(`Output validation failed: ${issues.join("; ")}`);
    }

    await promoteStagedOutput(stagedDir, publishDir);

    console.log(`\nPublished ${regionId} dataset:`);
    for (const metro of metros) {
      console.log(
        `  ${metro.id}: ${metroTownshipCounts[metro.id] ?? 0} sub-places`,
      );
    }
    for (const [network, count] of Object.entries(networkCoverage)) {
      console.log(`  ${network}: ${count} features`);
    }
  } catch (error) {
    await rm(stagedDir, { recursive: true, force: true });
    throw error;
  }
}
```

4. Replace the bottom-of-file entry point:

```ts
async function runAllProvinceRegions(): Promise<void> {
  const provinceRegions = REGIONS.filter((region) => region.kind === "province");
  for (const region of provinceRegions) {
    console.log(`\n### Region: ${region.id} ###`);
    await runRegion(region.id);
  }
}

const regionArgIndex = process.argv.indexOf("--region");
const requestedRegionId =
  regionArgIndex >= 0 ? process.argv[regionArgIndex + 1] : undefined;

const work = requestedRegionId ? runRegion(requestedRegionId) : runAllProvinceRegions();

work.catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Note: `data-pipeline/src/adapters/boundaries.test.ts`'s `nationalCollection` variable name and `data-pipeline/src/adapters/boundaries.ts`'s doc-comment referencing "national sub-place FeatureCollection" are just local naming/wording, unrelated to the `/data/national` directory — leave them as-is, no change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npm run test && npm run typecheck`
Expected: PASS (this only exercises the pure-transform unit tests — it does not run `runRegion` itself, since that requires live network/OSRM access. A full pipeline dry-run against real services is out of scope for this plan and is the operator's job to run manually later with `npm run run --prefix data-pipeline -- --region gauteng` when they next need to rebuild real data.)

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/run.ts
git commit -m "Parameterize the pipeline entry point by region instead of one hardcoded national run"
```

---

### Task 9: Region-aware output validation

**Files:**
- Modify: `data-pipeline/src/validateOutput.ts`
- Modify: `data-pipeline/src/validateOutput.test.ts`

**Interfaces:**
- Consumes: `REGIONS` from `@buffer-zones/shared` (Task 1), existing `validateOutputDirectory` from `outputManifest.ts` (unchanged).
- Produces: `runOutputValidation(outputDir: string): Promise<void>` (now requires an explicit directory — no more implicit default), plus a new `runAllRegionsOutputValidation(): Promise<void>` that iterates every region in `REGIONS`, skipping any whose output directory doesn't exist yet, and calls `runOutputValidation` for each that does. `npm run validate --prefix data-pipeline` (used by CI) now runs `runAllRegionsOutputValidation`.

- [ ] **Step 1: Write the failing test**

Replace `data-pipeline/src/validateOutput.test.ts` with:

```ts
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const outputManifestMocks = vi.hoisted(() => ({
  validateOutputDirectory: vi.fn<(outputDir: string) => Promise<string[]>>(),
}));

vi.mock("./outputManifest", () => ({
  validateOutputDirectory: outputManifestMocks.validateOutputDirectory,
}));

vi.mock("@buffer-zones/shared", () => ({
  REGIONS: [
    { id: "gauteng", label: "Gauteng", kind: "province" },
    { id: "not-yet-built", label: "Not Yet Built", kind: "custom" },
  ],
}));

import {
  runAllRegionsOutputValidation,
  runOutputValidation,
} from "./validateOutput";

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

    await runOutputValidation("/tmp/some-region");

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      "/tmp/some-region",
    );
    expect(console.log).toHaveBeenCalledWith(
      "Output validation passed for /tmp/some-region.",
    );
  });

  it("logs all issues and throws when validation fails", async () => {
    outputManifestMocks.validateOutputDirectory.mockResolvedValue([
      "Missing required output file: townships.display.v1.geojson",
    ]);

    await expect(runOutputValidation("/tmp/custom-output")).rejects.toThrow(
      "Output validation failed for /tmp/custom-output.",
    );

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

    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledTimes(1);
    expect(outputManifestMocks.validateOutputDirectory).toHaveBeenCalledWith(
      resolve(root, "gauteng"),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/validateOutput.test.ts`
Expected: FAIL — `runAllRegionsOutputValidation` doesn't exist yet, and `runOutputValidation()`'s current default-argument/message text don't match.

- [ ] **Step 3: Write minimal implementation**

```ts
// data-pipeline/src/validateOutput.ts
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { REGIONS } from "@buffer-zones/shared";
import { validateOutputDirectory } from "./outputManifest";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function runOutputValidation(outputDir: string): Promise<void> {
  const issues = await validateOutputDirectory(outputDir);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    throw new Error(`Output validation failed for ${outputDir}.`);
  }

  console.log(`Output validation passed for ${outputDir}.`);
}

export async function runAllRegionsOutputValidation(
  outputRoot = OUTPUT_ROOT,
): Promise<void> {
  for (const region of REGIONS) {
    const outputDir = resolve(outputRoot, region.id);
    if (!(await pathExists(outputDir))) {
      continue;
    }
    await runOutputValidation(outputDir);
  }
}

function isDirectExecution(argv: readonly string[]): boolean {
  const commandPath = argv[1];
  if (!commandPath) {
    return false;
  }

  return resolve(commandPath) === fileURLToPath(import.meta.url);
}

if (isDirectExecution(process.argv)) {
  runAllRegionsOutputValidation().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/validateOutput.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/validateOutput.ts data-pipeline/src/validateOutput.test.ts
git commit -m "Validate every region output directory instead of one hardcoded national path"
```

---

### Task 10: Migrate the committed data directory and remaining path references

**Files:**
- Move: `packages/web/public/data/national/` → `packages/web/public/data/gauteng/`
- Verify: no remaining `/data/national` references anywhere in `packages/web/src` or `data-pipeline/src`

**Interfaces:** none — this is a data/asset move plus a final repo-wide sweep, no code interfaces produced.

- [ ] **Step 1: Move the directory**

```bash
git mv packages/web/public/data/national packages/web/public/data/gauteng
```

- [ ] **Step 2: Sweep for anything still pointing at `/data/national`**

Run: `git grep -n "data/national"` (from repo root)
Expected: no matches. If any remain, fix them in place (every code reference should already have been updated in Tasks 5–9; this step exists to catch anything the plan missed, e.g. a stray reference in `README.md` or `CLAUDE.md` — update the prose there too, since both describe the current `/data/national/` layout).

- [ ] **Step 3: Update `CLAUDE.md` and `README.md` prose**

`CLAUDE.md`'s Architecture section currently says data-pipeline "writes one combined national dataset under `packages/web/public/data/national/`" and that `registry.ts` "points every layer to `/data/national/*.geojson`". Update both to describe the region-based layout (`packages/web/public/data/<regionId>/`, currently just `gauteng`), and mention that `REGIONS`/`runRegion` replace the old `runNational()`. Check `README.md` and `data-pipeline/README.md` for the same wording and update similarly.

- [ ] **Step 4: Run the full verification suite**

Run, from repo root:

```bash
npm run test
npm run typecheck
npm run lint
cd data-pipeline && npm run test && npm run typecheck && cd ..
```

Expected: all PASS. This is the full-suite check — every task above only ran its own scoped tests; this is where a cross-cutting miss (e.g. a forgotten `/data/national` string, or a stale import) would surface.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Migrate national output directory and docs to the gauteng region"
```

---

### Task 11: Final full-repo verification and push

**Files:** none — verification only.

- [ ] **Step 1: Run the complete verification matrix**

```bash
npm run test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
cd data-pipeline && npm run test && npm run typecheck && cd ..
```

Expected: all PASS.

- [ ] **Step 2: Confirm no e2e breakage**

Per the investigation, no Playwright spec references `/data/national`, so no e2e file changes are expected. Optionally run `npm run test:e2e` (per CLAUDE.md, requires `npm run playwright:install --workspace @buffer-zones/web` once) to double-check; if the Chromium binary isn't available in this environment, skip and note it rather than failing the task on an unrelated environment gap.

- [ ] **Step 3: Review the full diff**

Run: `git log --oneline main..HEAD` and `git diff main...HEAD --stat`
Confirm every changed file is one this plan intended to touch (shared constants/types, web registry/hooks/App, data-pipeline run/validateOutput, the moved data directory, docs).

- [ ] **Step 4: Push**

```bash
git push
```
