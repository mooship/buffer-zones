# Stratum Plan A: Shared Generic Layer/LayerGroup Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic, config-driven `Layer`/`LayerGroup` type system to `packages/shared`, and express the current 6 township/transit layers as data in a new `gauteng-spatial-legacy` domain package — additively, without touching `packages/web` or `data-pipeline`, so the whole repo stays green after every commit in this plan.

**Architecture:** New types live in `packages/shared/src/types/genericLayer.ts` alongside (not replacing) the existing `packages/shared/src/types/layer.ts`. The domain package (`packages/shared/src/domains/gauteng-spatial-legacy/`) is pure data built from the new types, snapshot-tested against today's hardcoded values in `packages/web` so Plan B has a verified source of truth to migrate to. Plan B later deletes the old `layer.ts` types and rewires `packages/web` onto this package; Plan C rewires `data-pipeline`.

**Tech Stack:** TypeScript, Vitest (unit tests), npm workspaces (`packages/shared`).

## Global Constraints

- TDD: write the failing test before implementation code (CLAUDE.md).
- No code comments unless capturing a genuinely non-obvious *why* (CLAUDE.md).
- British English spelling/grammar in all user-facing copy strings (CLAUDE.md) — applies to every `label`/`description` string added here.
- Biome `useBlockStatements: error` — always brace `if` statements (CLAUDE.md).
- Every commit in this plan must leave `npm run test` and `npm run typecheck` green across the whole repo (lefthook runs the full vitest suite on every commit) — this plan is strictly additive to avoid breaking `packages/web`/`data-pipeline`, which still import the old `LayerId`/`LayerDefinition`/`LayerStyle` from `packages/shared/src/types/layer.ts` unchanged.
- Design source of truth: `docs/superpowers/specs/2026-07-31-stratum-generic-layer-platform-design.md` (§3 Core abstractions). Note: this plan uses distinct names (`Layer`, `LayerGroup`, `ChoroplethLayerStyle`, etc.) instead of the spec's `LayerDefinition`/`LayerGroupDefinition` to avoid colliding with the still-live old types of the same name in `layer.ts` — Plan B renames/collapses these once the old types are deleted.

---

### Task 1: Add generic `Layer`/`LayerGroup` types

**Files:**
- Create: `packages/shared/src/types/genericLayer.ts`
- Test: `packages/shared/src/types/genericLayer.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `FeatureGeometryKind`, `ColorBucket`, `ChoroplethLayerStyle`, `LineLayerStyle`, `PointLayerStyle`, `LayerStyleConfig`, `LayerInteraction`, `Layer`, `LayerGroupSelectionMode`, `LayerGroup` — all exported from `@buffer-zones/shared`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/types/genericLayer.test.ts
import { describe, expect, it } from "vitest";
import type {
  ChoroplethLayerStyle,
  Layer,
  LayerGroup,
  LineLayerStyle,
  PointLayerStyle,
} from "./genericLayer";

describe("generic Layer/LayerGroup types", () => {
  it("accepts a choropleth layer with colour buckets", () => {
    const style: ChoroplethLayerStyle = {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [{ max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" }],
    };
    const layer: Layer = {
      id: "example-choropleth",
      label: "Example",
      description: "An example choropleth layer.",
      dataSource: ["/data/example/example.geojson"],
      geometryKind: "choropleth",
      defaultVisible: true,
      available: true,
      style,
    };
    expect(layer.style.kind).toBe("choropleth");
  });

  it("accepts a line layer with a legend label", () => {
    const style: LineLayerStyle = {
      kind: "line",
      color: "#E69F00",
      weight: 3,
      legendLabel: "Example line",
    };
    expect(style.legendLabel).toBe("Example line");
  });

  it("accepts a point layer with a legend label", () => {
    const style: PointLayerStyle = {
      kind: "point",
      color: "#009E73",
      radius: 4,
      legendLabel: "Example point",
    };
    expect(style.legendLabel).toBe("Example point");
  });

  it("accepts a layer with a companion source and interaction config", () => {
    const layer: Layer = {
      id: "example-selectable",
      label: "Example",
      dataSource: ["/data/example/a.geojson"],
      companionSource: "/data/example/b.geojson",
      geometryKind: "choropleth",
      defaultVisible: false,
      available: true,
      style: { kind: "choropleth", propertyKey: "value", buckets: [] },
      interaction: { selectable: true, labelField: "name" },
    };
    expect(layer.interaction?.selectable).toBe(true);
  });

  it("accepts an exclusive and an independent layer group", () => {
    const exclusive: LayerGroup = {
      id: "example-exclusive",
      title: "Example group",
      description: "Only one overlay can be active at a time.",
      selectionMode: "exclusive",
      layerIds: ["example-choropleth"],
    };
    const independent: LayerGroup = {
      id: "example-independent",
      title: "Example networks",
      selectionMode: "independent",
      layerIds: ["example-selectable"],
    };
    expect(exclusive.selectionMode).toBe("exclusive");
    expect(independent.description).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/types/genericLayer.test.ts`
Expected: FAIL with `Cannot find module './genericLayer'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/types/genericLayer.ts
export type FeatureGeometryKind = "choropleth" | "line" | "point";

export interface ColorBucket {
  max: number;
  color: string;
  label: string;
}

export interface ChoroplethLayerStyle {
  kind: "choropleth";
  propertyKey: string;
  buckets: ColorBucket[];
}

export interface LineLayerStyle {
  kind: "line";
  color: string;
  weight: number;
  legendLabel: string;
}

export interface PointLayerStyle {
  kind: "point";
  color: string;
  radius: number;
  legendLabel: string;
}

export type LayerStyleConfig =
  | ChoroplethLayerStyle
  | LineLayerStyle
  | PointLayerStyle;

export interface LayerInteraction {
  selectable: boolean;
  labelField?: string;
  popupFields?: string[];
}

export interface Layer {
  id: string;
  label: string;
  description?: string;
  dataSource: readonly string[];
  companionSource?: string;
  geometryKind: FeatureGeometryKind;
  defaultVisible: boolean;
  available: boolean;
  style: LayerStyleConfig;
  interaction?: LayerInteraction;
}

export type LayerGroupSelectionMode = "exclusive" | "independent";

export interface LayerGroup {
  id: string;
  title: string;
  description?: string;
  selectionMode: LayerGroupSelectionMode;
  layerIds: string[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/types/genericLayer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Export from the package entry point**

Open `packages/shared/src/index.ts`, find the existing `export * from "./types/layer";` (or equivalent) line, and add immediately after it:

```ts
export * from "./types/genericLayer";
```

- [ ] **Step 6: Run the full shared package test suite**

Run: `npm run test --workspace @buffer-zones/shared` (or `npx vitest run packages/shared`)
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types/genericLayer.ts packages/shared/src/types/genericLayer.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add generic Layer/LayerGroup types"
```

---

### Task 2: Build the `gauteng-spatial-legacy` domain layer data

**Files:**
- Create: `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts`
- Test: `packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`

**Interfaces:**
- Consumes: `Layer`, `ChoroplethLayerStyle`, `LineLayerStyle` from `./types/genericLayer` (Task 1).
- Produces: `GAUTENG_SPATIAL_LEGACY_LAYERS: Layer[]` — a 6-entry array (`townships`, `nearest-transit`, `rapid-rail`, `bus-rapid-transit`, `commuter-rail`, `bus`) with values verified against today's `packages/web/src/layers/registry.ts`, `packages/web/src/constants/colorScale.ts`, and `packages/web/src/constants/layerStyles.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts
import { describe, expect, it } from "vitest";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

describe("GAUTENG_SPATIAL_LEGACY_LAYERS", () => {
  it("has exactly the 6 layers the current app ships, in order", () => {
    expect(GAUTENG_SPATIAL_LEGACY_LAYERS.map((l) => l.id)).toEqual([
      "townships",
      "nearest-transit",
      "rapid-rail",
      "bus-rapid-transit",
      "commuter-rail",
      "bus",
    ]);
  });

  it("matches today's townships (commute time) choropleth exactly", () => {
    const layer = GAUTENG_SPATIAL_LEGACY_LAYERS.find((l) => l.id === "townships");
    expect(layer?.label).toBe("Modeled car time");
    expect(layer?.geometryKind).toBe("choropleth");
    expect(layer?.defaultVisible).toBe(true);
    expect(layer?.dataSource).toEqual(["/data/gauteng/townships.display.v1.geojson"]);
    expect(layer?.companionSource).toBe("/data/gauteng/township-areas.display.v1.geojson");
    expect(layer?.interaction).toEqual({ selectable: true, labelField: "name" });
    const style = layer?.style;
    if (style?.kind !== "choropleth") {
      throw new Error("expected choropleth style");
    }
    expect(style.propertyKey).toBe("commuteMinutes");
    expect(style.buckets).toEqual([
      { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
      { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
      { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
      { max: Number.POSITIVE_INFINITY, color: "#C1502E", label: "Very long (> 60 min)" },
    ]);
  });

  it("matches today's nearest-transit choropleth exactly", () => {
    const layer = GAUTENG_SPATIAL_LEGACY_LAYERS.find((l) => l.id === "nearest-transit");
    expect(layer?.label).toBe("Distance to Nearest Transit");
    expect(layer?.defaultVisible).toBe(false);
    expect(layer?.dataSource).toEqual(["/data/gauteng/townships.display.v1.geojson"]);
    const style = layer?.style;
    if (style?.kind !== "choropleth") {
      throw new Error("expected choropleth style");
    }
    expect(style.propertyKey).toBe("nearestTransitKm");
    expect(style.buckets).toEqual([
      { max: 1, color: "#CFE3F5", label: "Near (≤ 1 km)" },
      { max: 3, color: "#7FB2E5", label: "Moderate (1–3 km)" },
      { max: 8, color: "#3673B8", label: "Far (3–8 km)" },
      { max: Number.POSITIVE_INFINITY, color: "#123F6E", label: "Very far (> 8 km)" },
    ]);
  });

  it("matches today's 4 transit line layers exactly", () => {
    const byId = Object.fromEntries(GAUTENG_SPATIAL_LEGACY_LAYERS.map((l) => [l.id, l]));
    expect(byId["rapid-rail"].label).toBe("Rapid Rail");
    expect(byId["rapid-rail"].dataSource).toEqual(["/data/gauteng/rapid-rail.display.v1.geojson"]);
    expect(byId["rapid-rail"].style).toEqual({
      kind: "line",
      color: "#E69F00",
      weight: 3,
      legendLabel: "Rapid Rail",
    });
    expect(byId["bus-rapid-transit"].style).toEqual({
      kind: "line",
      color: "#009E73",
      weight: 3,
      legendLabel: "Bus Rapid Transit",
    });
    expect(byId["commuter-rail"].style).toEqual({
      kind: "line",
      color: "#D55E00",
      weight: 2,
      legendLabel: "Commuter Rail",
    });
    expect(byId.bus.style).toEqual({
      kind: "line",
      color: "#CC79A7",
      weight: 3,
      legendLabel: "Bus",
    });
    for (const id of ["rapid-rail", "bus-rapid-transit", "commuter-rail", "bus"]) {
      expect(byId[id].geometryKind).toBe("line");
      expect(byId[id].defaultVisible).toBe(false);
      expect(byId[id].available).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`
Expected: FAIL with `Cannot find module './layers'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/layers.ts
import type { Layer } from "../../types/genericLayer";

function dataUrl(fileName: string): string {
  return `/data/gauteng/${fileName}`;
}

export const GAUTENG_SPATIAL_LEGACY_LAYERS: Layer[] = [
  {
    id: "townships",
    label: "Modeled car time",
    description:
      "Modeled car drive-time from each recognised township area to its nearest selected job centre.",
    dataSource: [dataUrl("townships.display.v1.geojson")],
    companionSource: dataUrl("township-areas.display.v1.geojson"),
    geometryKind: "choropleth",
    defaultVisible: true,
    available: true,
    interaction: { selectable: true, labelField: "name" },
    style: {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [
        { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
        { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
        { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
        { max: Number.POSITIVE_INFINITY, color: "#C1502E", label: "Very long (> 60 min)" },
      ],
    },
  },
  {
    id: "nearest-transit",
    label: "Distance to Nearest Transit",
    description:
      "Straight-line distance from each recognised township area to the nearest formal transit route.",
    dataSource: [dataUrl("townships.display.v1.geojson")],
    companionSource: dataUrl("township-areas.display.v1.geojson"),
    geometryKind: "choropleth",
    defaultVisible: false,
    available: true,
    interaction: { selectable: true, labelField: "name" },
    style: {
      kind: "choropleth",
      propertyKey: "nearestTransitKm",
      buckets: [
        { max: 1, color: "#CFE3F5", label: "Near (≤ 1 km)" },
        { max: 3, color: "#7FB2E5", label: "Moderate (1–3 km)" },
        { max: 8, color: "#3673B8", label: "Far (3–8 km)" },
        { max: Number.POSITIVE_INFINITY, color: "#123F6E", label: "Very far (> 8 km)" },
      ],
    },
  },
  {
    id: "rapid-rail",
    label: "Rapid Rail",
    dataSource: [dataUrl("rapid-rail.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: "#E69F00", weight: 3, legendLabel: "Rapid Rail" },
  },
  {
    id: "bus-rapid-transit",
    label: "Bus Rapid Transit",
    dataSource: [dataUrl("bus-rapid-transit.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: "#009E73",
      weight: 3,
      legendLabel: "Bus Rapid Transit",
    },
  },
  {
    id: "commuter-rail",
    label: "Commuter Rail",
    dataSource: [dataUrl("commuter-rail.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: "#D55E00",
      weight: 2,
      legendLabel: "Commuter Rail",
    },
  },
  {
    id: "bus",
    label: "Bus",
    dataSource: [dataUrl("bus.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: "#CC79A7", weight: 3, legendLabel: "Bus" },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/domains/gauteng-spatial-legacy/layers.ts packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts
git commit -m "feat(shared): add gauteng-spatial-legacy domain layer data"
```

---

### Task 3: Build the `gauteng-spatial-legacy` domain layer groups

**Files:**
- Create: `packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.ts`
- Test: `packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.test.ts`

**Interfaces:**
- Consumes: `LayerGroup` from `../../types/genericLayer` (Task 1); layer ids from `./layers` (Task 2).
- Produces: `GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS: LayerGroup[]` — a 2-entry array (`access-to-opportunity` exclusive, `transit-networks` independent).

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.test.ts
import { describe, expect, it } from "vitest";
import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";

describe("GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS", () => {
  it("defines the access-to-opportunity exclusive group matching today's LayerToggles copy", () => {
    const group = GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS.find(
      (g) => g.id === "access-to-opportunity",
    );
    expect(group?.title).toBe("Accessibility overlays");
    expect(group?.description).toBe("Only one overlay can be active at a time.");
    expect(group?.selectionMode).toBe("exclusive");
    expect(group?.layerIds).toEqual(["townships", "nearest-transit"]);
  });

  it("defines the transit-networks independent group matching today's LayerToggles copy", () => {
    const group = GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS.find(
      (g) => g.id === "transit-networks",
    );
    expect(group?.title).toBe("Transit networks");
    expect(group?.selectionMode).toBe("independent");
    expect(group?.layerIds).toEqual([
      "rapid-rail",
      "bus-rapid-transit",
      "commuter-rail",
      "bus",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.test.ts`
Expected: FAIL with `Cannot find module './layerGroups'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.ts
import type { LayerGroup } from "../../types/genericLayer";

export const GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS: LayerGroup[] = [
  {
    id: "access-to-opportunity",
    title: "Accessibility overlays",
    description: "Only one overlay can be active at a time.",
    selectionMode: "exclusive",
    layerIds: ["townships", "nearest-transit"],
  },
  {
    id: "transit-networks",
    title: "Transit networks",
    selectionMode: "independent",
    layerIds: ["rapid-rail", "bus-rapid-transit", "commuter-rail", "bus"],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.ts packages/shared/src/domains/gauteng-spatial-legacy/layerGroups.test.ts
git commit -m "feat(shared): add gauteng-spatial-legacy domain layer groups"
```

---

### Task 4: Domain package entry point + story copy

**Files:**
- Create: `packages/shared/src/domains/gauteng-spatial-legacy/index.ts`
- Test: `packages/shared/src/domains/gauteng-spatial-legacy/index.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `GAUTENG_SPATIAL_LEGACY_LAYERS` (Task 2), `GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS` (Task 3).
- Produces: `GAUTENG_SPATIAL_LEGACY_DOMAIN: { id: string; layers: Layer[]; layerGroups: LayerGroup[]; story: { title: string; body: string } }`, exported from `@buffer-zones/shared`.

This step formalizes the "domain package" as a single object other packages (web, pipeline) can consume. The `story` field's exact copy is the existing "Why this map exists" panel text — the implementer must open `packages/web/src/App.tsx` (the story panel section, currently around lines 496-517) and copy the paragraph body text **verbatim** into `body` below; do not paraphrase or write new copy.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/index.test.ts
import { describe, expect, it } from "vitest";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "./index";

describe("GAUTENG_SPATIAL_LEGACY_DOMAIN", () => {
  it("bundles id, layers, layerGroups, and story copy", () => {
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.id).toBe("gauteng-spatial-legacy");
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.layers).toHaveLength(6);
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.layerGroups).toHaveLength(2);
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.story.title).toBe("Why this map exists");
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.story.body.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/index.test.ts`
Expected: FAIL with `Cannot find module './index'`.

- [ ] **Step 3: Write minimal implementation**

Read `packages/web/src/App.tsx`'s story panel JSX (the `<h2>Why this map exists</h2>` section) to find the exact body copy, then write:

```ts
// packages/shared/src/domains/gauteng-spatial-legacy/index.ts
import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

export const GAUTENG_SPATIAL_LEGACY_DOMAIN = {
  id: "gauteng-spatial-legacy",
  layers: GAUTENG_SPATIAL_LEGACY_LAYERS,
  layerGroups: GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS,
  story: {
    title: "Why this map exists",
    body: "Under apartheid, townships were deliberately separated from economic centers by distance and buffer strips of highways, industrial zoning, or vacant land. That geography did not disappear in 1994. This project makes the spatial structure visible while being explicit about what its current data cannot yet establish.",
  },
};

export { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";
export { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
```

If the exact wording found in `App.tsx`/`EvidenceSummary` differs from the placeholder body text above (which is transcribed from the current `README.md` "Why" section as the closest available source at plan-writing time), use the literal text found in `App.tsx` instead — the requirement is verbatim fidelity to the shipped copy, not to this specific string.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Export the domain from the package entry point**

Add to `packages/shared/src/index.ts`:

```ts
export * from "./domains/gauteng-spatial-legacy";
```

- [ ] **Step 6: Run the full repo test and typecheck suite**

Run: `npm run test && npm run typecheck`
Expected: PASS, zero regressions in `packages/web` or `data-pipeline` (this plan added code, touched nothing they import).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/domains/gauteng-spatial-legacy/index.ts packages/shared/src/domains/gauteng-spatial-legacy/index.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): bundle gauteng-spatial-legacy as a domain package"
```

---

## Plan A self-review notes

- **Spec coverage:** §3 (core abstractions) → Tasks 1; migration §4 step 1-2 (add new types, reimplement layers as data with a snapshot safety net) → Tasks 2-4.
- **No breakage:** every task only adds new files or appends new exports; nothing in `packages/web`/`data-pipeline` is modified, so their existing test suites are unaffected by construction.
- **Next plan:** Plan B consumes `GAUTENG_SPATIAL_LEGACY_DOMAIN` to replace `packages/web/src/layers/registry.ts` and delete the old `LayerId`/`LayerDefinition`/`LayerStyle` types once nothing references them.
