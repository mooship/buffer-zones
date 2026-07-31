# Stratum Plan B: Web Rendering Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `packages/web` off the closed-union `LayerId`/hardcoded `LayerDefinition` model onto the generic `Layer`/`LayerGroup` types and `GAUTENG_SPATIAL_LEGACY_DOMAIN` data from Plan A, removing every hardcoded township/transit special-case from rendering, styling, state, and copy — with zero user-visible behaviour change.

**Architecture:** `registry.ts` becomes a thin accessor over `GAUTENG_SPATIAL_LEGACY_DOMAIN`. `createLayerConfig.ts` becomes a pure function of `Layer.style` (buckets + an optional emphasis hook supplied by the domain layer, never a name-based lookup in core code). `useMapUiStore.ts` derives exclusivity from `LayerGroup.selectionMode`. `MapView.tsx`/`LayerToggles.tsx`/`Legend.tsx` dispatch on `geometryKind`/`interaction`/`style` instead of literal ids.

**Tech Stack:** React, TypeScript, Zustand, react-leaflet, Vitest + Testing Library.

## Global Constraints

- Plan A (`docs/superpowers/plans/2026-07-31-stratum-plan-a-shared-generic-types.md`) must be complete and merged before starting — this plan imports `GAUTENG_SPATIAL_LEGACY_DOMAIN`, `Layer`, `LayerGroup` from `@buffer-zones/shared`.
- TDD: write/update the failing test before implementation code (CLAUDE.md).
- British English in all user-facing copy (CLAUDE.md).
- Biome `useBlockStatements: error` — brace every `if` (CLAUDE.md).
- No code comments unless capturing a genuinely non-obvious *why* (CLAUDE.md).
- **Zero user-visible regression**: every existing layer toggle label, exclusivity behaviour, legend bucket, and map interaction must render identically after this plan. This is the acceptance bar, verified by the existing (updated-in-place, not rewritten) unit/component test suites plus e2e specs.
- The core type-shape swap across `registry.ts`/`createLayerConfig.ts`/`useMapUiStore.ts`/`MapView.tsx`/`LayerToggles.tsx`/`Legend.tsx` is one interdependent change — Task 2 below intentionally bundles it into a single commit at the end, because any intermediate state where only some of these files are migrated fails to typecheck (lefthook runs the full suite on every commit; a broken intermediate commit is not acceptable).

---

### Task 1: Add emphasis-hook support to `ChoroplethLayerStyle` and wire it into the domain layers

**Files:**
- Modify: `packages/shared/src/types/genericLayer.ts`
- Modify: `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts`
- Test: `packages/shared/src/types/genericLayer.test.ts`, `packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`

**Interfaces:**
- Consumes: `getTownshipGroup` from `packages/shared/src/constants/townships.ts` (already in the shared package, no cross-package import needed).
- Produces: `ChoroplethLayerStyle` gains `baseOpacity: number`, `emphasisOpacity?: number`, `resolveEmphasis?: (properties: Record<string, unknown> | null | undefined) => boolean`.

This replaces `createLayerConfig.ts`'s current `getTownshipGroup(name, id) !== undefined` lookup (today embedded directly in web-side styling code) with a hook the *domain* supplies — core rendering code will only ever call `style.resolveEmphasis?.(feature.properties)`, never import township-specific lookups itself.

- [ ] **Step 1: Write the failing test for the new style fields**

Add to `packages/shared/src/types/genericLayer.test.ts`:

```ts
it("accepts a choropleth style with an emphasis resolver", () => {
  const style: ChoroplethLayerStyle = {
    kind: "choropleth",
    propertyKey: "commuteMinutes",
    buckets: [],
    baseOpacity: 0.18,
    emphasisOpacity: 0.78,
    resolveEmphasis: (properties) => properties?.name === "example",
  };
  expect(style.resolveEmphasis?.({ name: "example" })).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/types/genericLayer.test.ts`
Expected: FAIL — TypeScript error, `baseOpacity` does not exist on type `ChoroplethLayerStyle`.

- [ ] **Step 3: Implement the type change**

In `packages/shared/src/types/genericLayer.ts`, replace:

```ts
export interface ChoroplethLayerStyle {
  kind: "choropleth";
  propertyKey: string;
  buckets: ColorBucket[];
}
```

with:

```ts
export interface ChoroplethLayerStyle {
  kind: "choropleth";
  propertyKey: string;
  buckets: ColorBucket[];
  baseOpacity: number;
  emphasisOpacity?: number;
  resolveEmphasis?: (
    properties: Record<string, unknown> | null | undefined,
  ) => boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/types/genericLayer.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the domain layers**

Add to `packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`, inside the existing `"matches today's townships (commute time) choropleth exactly"` test, after the `buckets` assertion:

```ts
    expect(style.baseOpacity).toBe(0.18);
    expect(style.emphasisOpacity).toBe(0.78);
    expect(style.resolveEmphasis?.({ name: "Mamelodi", id: "1" })).toBe(true);
    expect(style.resolveEmphasis?.({ name: "Not A Real Place" })).toBe(false);
```

Add the same three assertions (with `baseOpacity`/`emphasisOpacity` at 0.18/0.78) to the `"matches today's nearest-transit choropleth exactly"` test.

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`
Expected: FAIL — `resolveEmphasis` is `undefined`, or the real "Mamelodi" fixture doesn't yet resolve `true` (adjust to whichever township name your local `townships.ts` actually recognises; use `getTownshipGroup`'s own test fixtures in `townships.test.ts` for a guaranteed-real example name if "Mamelodi" isn't one).

- [ ] **Step 7: Implement in the domain layers file**

In `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts`, add the import and update both choropleth style blocks:

```ts
import { getTownshipGroup } from "../../constants/townships";
```

```ts
function resolveTownshipEmphasis(
  properties: Record<string, unknown> | null | undefined,
): boolean {
  const name = properties?.name;
  const id = properties?.id;
  if (typeof name !== "string") {
    return false;
  }
  return (
    getTownshipGroup(name, typeof id === "string" ? id : undefined) !==
    undefined
  );
}
```

Add `baseOpacity: 0.18, emphasisOpacity: 0.78, resolveEmphasis: resolveTownshipEmphasis,` to both the `townships` and `nearest-transit` style objects (alongside `propertyKey`/`buckets`).

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts`
Expected: PASS.

- [ ] **Step 9: Run the full shared package suite and commit**

Run: `npm run test --workspace @buffer-zones/shared`
Expected: PASS.

```bash
git add packages/shared/src/types/genericLayer.ts packages/shared/src/types/genericLayer.test.ts packages/shared/src/domains/gauteng-spatial-legacy/layers.ts packages/shared/src/domains/gauteng-spatial-legacy/layers.test.ts
git commit -m "feat(shared): add emphasis-resolver hook to choropleth style"
```

---

### Task 2: Migrate `packages/web` onto the generic `Layer`/`LayerGroup` model

**Files:**
- Modify: `packages/web/src/layers/registry.ts`, `packages/web/src/layers/registry.test.ts`
- Modify: `packages/web/src/layers/createLayerConfig.ts`, `packages/web/src/layers/createLayerConfig.test.ts`
- Modify: `packages/web/src/stores/useMapUiStore.ts`, `packages/web/src/stores/useMapUiStore.test.ts`
- Modify: `packages/web/src/components/MapView/MapView.tsx`, `packages/web/src/components/MapView/MapView.test.tsx`
- Modify: `packages/web/src/components/LayerToggles/LayerToggles.tsx`
- Modify: `packages/web/src/components/Legend/Legend.tsx`
- Modify: `packages/web/src/hooks/useLayerData.ts`, `packages/web/src/hooks/useLayerData.test.ts`
- Modify: `packages/web/src/App.tsx`
- Delete: `packages/shared/src/types/layer.ts` (and its `.test.ts`) once nothing imports it

**Interfaces:**
- Consumes: `Layer`, `LayerGroup`, `LayerStyleConfig` and `GAUTENG_SPATIAL_LEGACY_DOMAIN` from `@buffer-zones/shared` (Plan A + Task 1).
- Produces: `getLayers(): Layer[]`, `getLayer(id: string): Layer | undefined`, `getLayerGroups(): LayerGroup[]` from `registry.ts` — the new public surface every other file in this task consumes. `useLayerData(layerIds: string[]): Partial<Record<string, FeatureCollection>>` (id type widened from `LayerId` to `string`).

This task is deliberately one commit: `registry.ts`'s output type changes (`layerType` → `geometryKind`, `style` is required not optional, `id` is `string` not `LayerId`), and every listed file either produces or consumes that shape, so they must move together for the repo to typecheck at each intermediate `git commit`. Steps below are still bite-sized and independently run/verified — only the final `git commit` is deferred to the end.

- [ ] **Step 1: Rewrite `registry.test.ts` for the generic surface**

Replace the contents of `packages/web/src/layers/registry.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { getLayer, getLayerGroups, getLayers } from "./registry";

describe("registry", () => {
  it("returns the 6 gauteng-spatial-legacy layers", () => {
    const layers = getLayers();
    expect(layers.map((l) => l.id)).toEqual(
      expect.arrayContaining([
        "townships",
        "nearest-transit",
        "rapid-rail",
        "bus-rapid-transit",
        "commuter-rail",
        "bus",
      ]),
    );
  });

  it("every layer dataSource points at a per-region geojson URL", () => {
    for (const layer of getLayers()) {
      for (const url of layer.dataSource) {
        expect(url).toMatch(/^\/data\/[\w-]+\/[\w.-]+\.geojson$/);
      }
    }
  });

  it("looks up a single layer by id", () => {
    expect(getLayer("rapid-rail")?.label).toBe("Rapid Rail");
    expect(getLayer("does-not-exist")).toBeUndefined();
  });

  it("returns the 2 layer groups", () => {
    const groups = getLayerGroups();
    expect(groups.map((g) => g.id)).toEqual([
      "access-to-opportunity",
      "transit-networks",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: FAIL — `getLayer`/`getLayers`/`getLayerGroups` not exported.

- [ ] **Step 3: Rewrite `registry.ts`**

```ts
// packages/web/src/layers/registry.ts
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@buffer-zones/shared";
import type { Layer, LayerGroup } from "@buffer-zones/shared";

export function getLayers(): readonly Layer[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers;
}

export function getLayer(id: string): Layer | undefined {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers.find((layer) => layer.id === id);
}

export function getLayerGroups(): readonly LayerGroup[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layerGroups;
}
```

Delete `packages/web/src/constants/layerStyles.ts`'s `STATION_LAYER_IDS` re-typing concern for later (Step 10 below handles `Legend.tsx`'s use of it — its `LayerId` import just widens to `string`, no logic change needed there).

- [ ] **Step 4: Run test to verify it passes (registry only, other files will still fail to compile — expected at this point)**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: PASS. (Do not run the full suite yet — `createLayerConfig.ts` etc. still reference the old shape and will fail to compile; that's addressed in the following steps before the final full-suite run.)

- [ ] **Step 5: Rewrite `createLayerConfig.test.ts` and `createLayerConfig.ts`**

Update `createLayerConfig.test.ts` so its choropleth cases construct a `Layer` with the new `style` shape (`buckets`, `baseOpacity`, `emphasisOpacity`, `resolveEmphasis`) instead of a bare `propertyKey`, and assert `styleFn` still returns the same `fillColor`/`fillOpacity`/`weight` values as before for representative inputs (e.g. `commuteMinutes: 15` → the "Short" bucket colour `#7A9B6E`, `fillOpacity: 0.78` when `resolveEmphasis` returns `true`).

Rewrite `packages/web/src/layers/createLayerConfig.ts`:

```ts
import type { Layer } from "@buffer-zones/shared";
import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";

export interface LeafletLayerConfig {
  pathOptions?: PathOptions & { noClip?: boolean };
  styleFn?: (feature?: Feature) => PathOptions;
}

function colorForValue(
  value: number | null,
  buckets: Layer["style"] extends { kind: "choropleth"; buckets: infer B }
    ? B
    : never,
  noDataColor: string,
): string {
  if (value === null) {
    return noDataColor;
  }
  const bucket = buckets.find((b) => value <= b.max);
  return bucket?.color ?? buckets[buckets.length - 1]?.color ?? noDataColor;
}

export function createLayerConfig(layer: Layer): LeafletLayerConfig {
  const style = layer.style;

  switch (style.kind) {
    case "choropleth": {
      const noDataColor =
        style.buckets.find((b) => b.label === "No data")?.color ?? "#8A93A5";
      return {
        styleFn: (feature) => {
          const raw = feature?.properties?.[style.propertyKey];
          const value = typeof raw === "number" ? raw : null;
          const emphasised = style.resolveEmphasis?.(feature?.properties);
          return {
            fillColor: colorForValue(value, style.buckets, noDataColor),
            fillOpacity: emphasised
              ? (style.emphasisOpacity ?? style.baseOpacity)
              : style.baseOpacity,
            weight: 0,
          };
        },
      };
    }
    case "line":
      return {
        pathOptions: {
          color: style.color,
          weight: style.weight,
          opacity: 0.95,
          noClip: true,
          lineCap: "round",
          lineJoin: "round",
        },
      };
    case "point":
      return { pathOptions: { color: style.color, fillColor: style.color } };
  }
}
```

Note: the original `commuteMinutesToColor`/`transitDistanceToColor`/`getCommuteBucket`/`getTransitDistanceBucket` helpers in `packages/web/src/utils/colorScale.ts` and `packages/web/src/constants/colorScale.ts` become dead code once this lands — delete both files and their tests in Step 11 below, since `colorForValue` above supersedes them generically.

- [ ] **Step 6: Run createLayerConfig tests to verify they pass**

Run: `npx vitest run packages/web/src/layers/createLayerConfig.test.ts`
Expected: PASS.

- [ ] **Step 7: Update `useMapUiStore.ts` and its test**

In `useMapUiStore.test.ts`, replace any assertions keyed on the hardcoded `ACCESS_LAYER_IDS` array with assertions against `getLayerGroups()` — e.g. toggling `"nearest-transit"` on while `"townships"` is visible should turn `"townships"` off (same behaviour, now driven by the `access-to-opportunity` group's `selectionMode: "exclusive"`).

Rewrite `packages/web/src/stores/useMapUiStore.ts`:

```ts
import { create } from "zustand";
import type { Basemap } from "../constants/basemaps";
import { getLayerGroups, getLayers } from "../layers/registry";

function findGroupContaining(id: string) {
  return getLayerGroups().find((group) => group.layerIds.includes(id));
}

function isExclusiveGroupMember(id: string): boolean {
  return findGroupContaining(id)?.selectionMode === "exclusive";
}

function groupSiblings(id: string): string[] {
  const group = findGroupContaining(id);
  if (!group || group.selectionMode !== "exclusive") {
    return [];
  }
  return group.layerIds.filter((sibling) => sibling !== id);
}

export type PanelView = "story" | "places" | "layers";

interface MapUiState {
  visibleLayerIds: string[];
  basemap: Basemap;
  panelOpen: boolean;
  panelView: PanelView;
  titleExpanded: boolean;
  selectedFeatureId: string | null;
  toggleLayer: (id: string) => void;
  setBasemap: (basemap: Basemap) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelView: (view: PanelView) => void;
  setTitleExpanded: (expanded: boolean) => void;
  setSelectedFeatureId: (id: string | null) => void;
  reset: () => void;
}

function createInitialState() {
  return {
    visibleLayerIds: getLayers()
      .filter((layer) => layer.defaultVisible)
      .map((layer) => layer.id),
    basemap: "street" as const,
    panelOpen: false,
    panelView: "story" as const,
    titleExpanded: false,
    selectedFeatureId: null,
  };
}

export const useMapUiStore = create<MapUiState>()((set) => ({
  ...createInitialState(),
  toggleLayer: (id) =>
    set((state) => {
      if (state.visibleLayerIds.includes(id)) {
        return {
          visibleLayerIds: state.visibleLayerIds.filter(
            (existing) => existing !== id,
          ),
        };
      }

      if (isExclusiveGroupMember(id)) {
        const siblings = groupSiblings(id);
        return {
          visibleLayerIds: [
            ...state.visibleLayerIds.filter(
              (existing) => !siblings.includes(existing),
            ),
            id,
          ],
        };
      }

      return { visibleLayerIds: [...state.visibleLayerIds, id] };
    }),
  setBasemap: (basemap) => set({ basemap }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelView: (panelView) => set({ panelView }),
  setTitleExpanded: (titleExpanded) => set({ titleExpanded }),
  setSelectedFeatureId: (selectedFeatureId) => set({ selectedFeatureId }),
  reset: () => set(createInitialState()),
}));
```

`selectedTownshipId`/`setSelectedTownshipId` are renamed to `selectedFeatureId`/`setSelectedFeatureId` (generic — any selectable layer's feature, not just townships). Update every call site accordingly in the remaining steps.

- [ ] **Step 8: Run useMapUiStore tests to verify they pass**

Run: `npx vitest run packages/web/src/stores/useMapUiStore.test.ts`
Expected: PASS.

- [ ] **Step 9: Update `useLayerData.ts` and its test for the widened id type and `companionSource`**

In `useLayerData.test.ts`, widen mock `LayerId` usages to plain strings and add one new case: when a requested layer's `getLayer(id)` returns a `companionSource`, `useLayerData` fetches and stores it under a `${id}:companion` key.

Rewrite `packages/web/src/hooks/useLayerData.ts`'s type signature and fetch loop to use `getLayer` from `./../layers/registry` (renamed from `getLayerDefinition`) and fetch `definition.companionSource` alongside `definition.dataSource` when present, merging it into a separate map key rather than into the same `FeatureCollection`:

```ts
export type LayerDataMap = Partial<Record<string, FeatureCollection>>;

export function useLayerData(layerIds: string[]): LayerDataMap {
  // ... identical structure to before, but:
  // - `getLayerDefinition` -> `getLayer`
  // - after resolving `collections` for `definition.dataSource`, if
  //   `definition.companionSource` is set, also fetch it and store the
  //   result under the key `${id}:companion` in the same `setData` call.
}
```

- [ ] **Step 10: Run useLayerData tests to verify they pass**

Run: `npx vitest run packages/web/src/hooks/useLayerData.test.ts`
Expected: PASS.

- [ ] **Step 11: Update `LayerToggles.tsx` to render `LayerGroup`s generically**

```tsx
// packages/web/src/components/LayerToggles/LayerToggles.tsx
import { getLayer, getLayerGroups } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: string[];
  onToggle: (id: string) => void;
}

export function LayerToggles({ visibleLayerIds, onToggle }: LayerTogglesProps) {
  const groups = getLayerGroups();

  function renderLayer(layerId: string) {
    const layer = getLayer(layerId);
    if (!layer) {
      return null;
    }
    const layerTestId = `layer-toggle-${layer.id}`;
    return (
      <li key={layer.id}>
        <label
          className={styles.row}
          data-unavailable={layer.available ? undefined : "true"}
          data-testid={`${layerTestId}-row`}
          data-e2e={`${layerTestId}-row`}
        >
          <input
            type="checkbox"
            className={styles.checkbox}
            data-testid={layerTestId}
            data-e2e={layerTestId}
            checked={visibleLayerIds.includes(layer.id)}
            disabled={!layer.available}
            onChange={() => onToggle(layer.id)}
          />
          <span className={styles.label}>{layer.label}</span>
          {layer.available ? null : (
            <span className={styles.badge}>Not yet available</span>
          )}
        </label>
      </li>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((group, index) => (
        <div key={group.id}>
          {index > 0 ? <div className={styles.divider} aria-hidden="true" /> : null}
          <section className={styles.group} aria-label={group.title}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            {group.description ? (
              <p className={styles.groupHint}>{group.description}</p>
            ) : null}
            <ul className={styles.list}>{group.layerIds.map(renderLayer)}</ul>
          </section>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 12: Update `Legend.tsx` to render purely from layer/style config**

Replace the hardcoded `ENTRIES`/`TRANSIT_DISTANCE_ENTRIES` arrays and the `visibleLayerIds.includes("townships")`/`"nearest-transit"` gating with generic lookups:

```tsx
// packages/web/src/components/Legend/Legend.tsx (key excerpt)
import { getLayer, getLayers } from "../../layers/registry";
import { STATION_LAYER_IDS } from "../../constants/layerStyles";

interface LegendProps {
  mode?: "all" | "active";
  visibleLayerIds?: string[];
  compact?: boolean;
}

function choroplethLegends(visibleLayerIds?: string[]) {
  return getLayers().flatMap((layer) => {
    if (layer.style.kind !== "choropleth") {
      return [];
    }
    if (visibleLayerIds && !visibleLayerIds.includes(layer.id)) {
      return [];
    }
    return [{ layer, buckets: layer.style.buckets }];
  });
}

function getTransitEntries(visibleLayerIds?: string[]) {
  return getLayers().flatMap((layer) =>
    layer.available &&
    layer.style.kind === "line" &&
    (!visibleLayerIds || visibleLayerIds.includes(layer.id))
      ? [
          {
            label: layer.style.legendLabel,
            color: layer.style.color,
            hasStations: STATION_LAYER_IDS.includes(layer.id),
          },
        ]
      : [],
  );
}
```

Render one `<section>` per entry from `choroplethLegends(...)` (heading = `entry.layer.label`, list items from `entry.buckets`) instead of the two hardcoded sections, followed by the existing transit-routes section driven by `getTransitEntries`. `getLayer` import stays available for any single-layer lookups the surrounding component logic needs.

- [ ] **Step 13: Update `MapView.tsx`**

Apply these targeted changes (the rest of the 639-line file is unaffected):

- Replace every `getLayerDefinitions()` call with `getLayers()`, and the `LayerId` import with plain `string`.
- Replace `layer.layerType` with `layer.geometryKind` everywhere (the render-loop's `isChoropleth` check, the `overlayData` filter, and the pane/handler selection).
- Replace the literal `showAreaLabels = visibleLayerIds.includes("townships") || visibleLayerIds.includes("nearest-transit")` with a generic check: `showAreaLabels = getLayers().some((layer) => visibleLayerIds.includes(layer.id) && layer.interaction?.labelField !== undefined)`.
- Replace `bindTownshipFeatureInteractions`'s hardcoded selection logic with a generic `bindSelectableFeatureInteractions(feature, layer, leafletLayer, layerById, onSelect)` that only runs when `layer.interaction?.selectable` is true, using `layer.interaction?.labelField` (default `"name"`) for the popup/label text instead of a hardcoded property name. Rename the `TownshipSelection` component to `SelectedFeatureHighlight`, keyed off the store's renamed `selectedFeatureId`.
- Replace `bindTownshipAreaLabel`'s hardcoded call site with one gated on `layer.interaction?.labelField` being set, for whichever layer's `companionSource` data is loaded (the aggregated label-polygon layer), rather than being wired only for the two hardcoded layer ids.
- Update the props type: `selectedTownshipId?: string | null` → `selectedFeatureId?: string | null`; `onTownshipSelect?` → `onFeatureSelect?`.

Update `MapView.test.tsx` in lockstep: anywhere it constructs mock `LayerDefinition`s with `layerType`, switch to `geometryKind`; anywhere it passes `selectedTownshipId`, switch to `selectedFeatureId`.

- [ ] **Step 14: Update `App.tsx`**

- Rename `selectedTownshipId`/`setSelectedTownshipId`/`onTownshipSelect` call sites to `selectedFeatureId`/`setSelectedFeatureId`/`onFeatureSelect`, matching Steps 7 and 13.
- Fold the bespoke `township.display.v1.geojson` + `township-areas.display.v1.geojson` fetch effect (today's lines ~126-161) into `useLayerData`: since `useLayerData` now fetches `companionSource` automatically (Step 9), pass the full visible layer id list to `useLayerData` (including `"townships"`) instead of maintaining a separate `townships`/`townshipAreas` state + effect, and read the "townships" layer's data + its `:companion` key from the returned map when building `MapView`'s props.
- Replace the hardcoded `PANEL_LABELS` map and the story panel's hardcoded `<h2>Why this map exists</h2>` + body paragraph with `GAUTENG_SPATIAL_LEGACY_DOMAIN.story.title`/`.body`, imported from `@buffer-zones/shared`.

- [ ] **Step 15: Delete the now-dead old types and colour-scale files**

```bash
rm packages/shared/src/types/layer.ts packages/shared/src/types/layer.test.ts
rm packages/web/src/utils/colorScale.ts packages/web/src/utils/colorScale.test.ts
rm packages/web/src/constants/colorScale.ts
```

Remove the corresponding `export * from "./types/layer";` line from `packages/shared/src/index.ts` (the generic `genericLayer.ts` export from Plan A Task 1 stays). Remove the now-unused `ACCESS_LAYER_IDS`-style constants and any remaining `LayerId`/`LayerType` imports across the files touched in this task (search: `grep -rn "LayerId\|LayerType\b" packages/web/src packages/shared/src`).

- [ ] **Step 16: Run the full repo test and typecheck suite**

Run: `npm run test && npm run typecheck`
Expected: PASS — every test file updated in this task passes, and no file anywhere still references the deleted `LayerId`/`LayerType`/old `LayerDefinition`/old `LayerStyle` types.

- [ ] **Step 17: Manually verify no visual regression**

Run: `npm run dev --workspace @buffer-zones/web`, open the app, and confirm: default view shows the commute-time choropleth; toggling "Distance to Nearest Transit" turns off the commute-time layer (exclusivity preserved); each transit line layer toggles independently; the legend shows the same bucket colours/labels as before; clicking a township still selects it, fits bounds, and shows its popup.

- [ ] **Step 18: Commit**

```bash
git add packages/web packages/shared/src/types/genericLayer.ts packages/shared/src/index.ts
git commit -m "feat(web): migrate rendering to generic Layer/LayerGroup model"
```

---

### Task 3: Update e2e specs for renamed state fields

**Files:**
- Modify: `packages/web/e2e/layer-toggles.spec.ts`, `packages/web/e2e/township-browser.spec.ts` (and any other e2e spec found to reference `selectedTownshipId`/`onTownshipSelect` test hooks — search first)

**Interfaces:**
- Consumes: the same `data-testid`/`data-e2e` attributes as before (unchanged ids: `layer-toggle-townships`, etc. — Task 2 preserved these).

- [ ] **Step 1: Search for references to renamed internals**

Run: `grep -rn "selectedTownshipId\|onTownshipSelect\|TownshipSelection" packages/web/e2e`

- [ ] **Step 2: Update any matches found**

For each match, rename to the Task 2 equivalents (`selectedFeatureId`/`onFeatureSelect`/`SelectedFeatureHighlight`). If the spec only asserts on `data-testid`/`data-e2e` attributes (which did not change), no edit is needed — record that finding instead.

- [ ] **Step 3: Run the e2e suite**

Run: `npm run build && npm run test:e2e`
Expected: PASS, identical to pre-migration behaviour.

- [ ] **Step 4: Commit (only if files changed)**

```bash
git add packages/web/e2e
git commit -m "test(e2e): update specs for renamed selection state"
```

If no files changed in Step 2, skip this step — there is nothing to commit.

---

## Plan B self-review notes

- **Spec coverage:** §3/§4 migration steps 3-5 (refactor core rendering, fold companion fetch, delete old types) → Task 2. §6 UI restructure (LayerToggles/Legend generic rendering, copy from domain config) → Task 2 Steps 11-12, 14. §4 step 6 (e2e regression gate) → Task 3.
- **Type consistency check:** `getLayer`/`getLayers`/`getLayerGroups` (registry.ts, Task 2 Step 3) are the exact names consumed in Steps 5, 7, 9, 11, 12, 13. `selectedFeatureId`/`setSelectedFeatureId`/`onFeatureSelect` are consistent across Steps 7, 13, 14. `companionSource`/`:companion` key naming is consistent across Steps 9 and 14.
- **Next plan:** Plan C migrates `data-pipeline` onto the same `GAUTENG_SPATIAL_LEGACY_DOMAIN`-adjacent config, independently of this plan's web changes.
