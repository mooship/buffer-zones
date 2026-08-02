# SDK Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract domain-agnostic code from `packages/web` and `packages/shared` into three new publishable packages (`@stratum/core`, `@stratum/map`, `@stratum/react`), rename `packages/shared` to `packages/app`, and update all import paths — with identical runtime behaviour throughout.

**Architecture:** Re-export stubs keep `packages/web` building and passing tests throughout Tasks 1–4; Task 5 is the final clean-up. Each task ends with `npm run test` green and a git commit. New packages are discovered automatically by the root vitest `projects: ["packages/*"]` glob.

**Tech Stack:** TypeScript, vitest, React 19, react-leaflet, Leaflet, Zod/mini, usehooks-ts, @testing-library/react, happy-dom, Biome.

## Global Constraints

- Do NOT change runtime behaviour — structural refactor only.
- TDD: write the failing test before implementation code for every new function/component.
- JSDoc on every exported function, type, interface, and component in `@stratum/core`, `@stratum/map`, `@stratum/react` only — TSDoc-compatible (`@param`, `@returns`, `@example`, `@remarks`).
- Doc updates (CLAUDE.md, `.github/copilot-instructions.md`) are part of each task's definition of done.
- No test deleted or assertion weakened to make a task pass — fix the code instead.
- British English in all user-facing copy.
- Commit after every task.
- `react-leaflet` mock goes **inline** in each test file via `vi.mock("react-leaflet", ...)` — never in `vitest.setup.ts`.
- `packages/core` and `packages/react` vitest configs use `defineProject` from `"vitest/config"`. `packages/map` uses `defineConfig` from `"vite"` with `plugins: [react()]`.

---

## File Structure

### Created by Task 1
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/vitest.config.ts`
- `packages/core/src/index.ts`
- `packages/core/src/types/layer.ts` — Layer, LayerGroup, all style types, DomainConfig
- `packages/core/src/layers/createLayerConfig.ts` — LeafletLayerConfig, createLayerConfig(layer, noDataColor?)
- `packages/core/src/layers/createRegistry.ts` — createRegistry(domain)
- `packages/core/src/data/fetchFeatureCollection.ts`
- `packages/core/src/data/mergeFeatureCollections.ts`
- `packages/core/src/data/geoJsonSchemas.ts` — generic schemas only (no township-specific)
- `packages/core/src/layers/createLayerConfig.test.ts`
- `packages/core/src/layers/createRegistry.test.ts`
- `packages/core/src/data/fetchFeatureCollection.test.ts`
- `packages/core/src/data/mergeFeatureCollections.test.ts`
- `packages/core/src/data/geoJsonSchemas.test.ts`

### Modified by Task 1
- `packages/shared/src/types/genericLayer.ts` → re-export stub
- `packages/web/src/layers/createLayerConfig.ts` → re-export stub (test file deleted — moved to core)
- `packages/web/src/data/fetchFeatureCollection.ts` → re-export stub (test file deleted — moved to core)
- `packages/web/src/data/mergeFeatureCollections.ts` → re-export stub (test file deleted — moved to core)
- `packages/web/src/data/geoJsonSchemas.ts` → keeps township schemas, re-exports generics from `@stratum/core`
- `packages/web/src/data/geoJsonSchemas.test.ts` → removes generic tests (moved to core)
- `packages/web/src/layers/registry.ts` → uses `createRegistry` from `@stratum/core`
- `packages/web/package.json` → add `@stratum/core` dep

### Created by Task 2
- `packages/map/package.json`
- `packages/map/tsconfig.json`
- `packages/map/vite.config.ts` — defineConfig + react() plugin
- `packages/map/vitest.setup.ts`
- `packages/map/src/index.ts`
- `packages/map/src/context/DomainContext.tsx` — DomainProvider, useDomain, DomainRegistry
- `packages/map/src/constants/mapStyles.ts` — TOWNSHIP_OUTLINE
- `packages/map/src/constants/basemaps.ts` — moved from web
- `packages/map/src/data/locationSearch.ts` — moved from web
- `packages/map/src/components/MapView/MapView.tsx` — genericised (bounds prop, renderFeaturePopup, useDomain)
- `packages/map/src/components/MapView/MapView.module.css`
- `packages/map/src/components/MapView/MapView.test.tsx`
- `packages/map/src/components/Legend/Legend.tsx` — genericised (useDomain, hasPointGeometry)
- `packages/map/src/components/Legend/Legend.module.css`
- `packages/map/src/components/Legend/Legend.test.tsx`
- `packages/map/src/components/DesktopLegend/DesktopLegend.tsx`
- `packages/map/src/components/DesktopLegend/DesktopLegend.module.css`
- `packages/map/src/components/MobileLegend/MobileLegend.tsx`
- `packages/map/src/components/MobileLegend/MobileLegend.module.css`
- `packages/map/src/components/LocationSearchControl/LocationSearchControl.tsx` — placeholder prop added
- `packages/map/src/components/LocationSearchControl/LocationSearchControl.module.css`
- `packages/map/src/components/LocationSearchControl/LocationSearchControl.test.tsx`
- `packages/map/src/components/IconButton/IconButton.tsx`
- `packages/map/src/components/IconButton/IconButton.test.tsx`
- `packages/map/src/components/SegmentedControl/SegmentedControl.tsx`
- `packages/map/src/components/SegmentedControl/SegmentedControl.module.css`
- `packages/map/src/components/SegmentedControl/SegmentedControl.test.tsx`
- `packages/map/src/components/ControlButton/ControlButton.tsx`
- `packages/map/src/components/ThemeToggle/ThemeToggle.tsx`
- `packages/map/src/components/BasemapToggle/BasemapToggle.tsx`
- `packages/map/src/components/SettingsMenu/SettingsMenu.tsx`

### Modified by Task 2
- `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts` — add `hasPointGeometry: true` to rapid-rail and commuter-rail
- `packages/web/src/components/MapView/MapView.tsx` → re-export stub
- `packages/web/src/components/Legend/Legend.tsx` → re-export stub
- `packages/web/src/components/DesktopLegend/DesktopLegend.tsx` → re-export stub
- `packages/web/src/components/MobileLegend/MobileLegend.tsx` → re-export stub
- `packages/web/src/components/LocationSearchControl/LocationSearchControl.tsx` → re-export stub
- `packages/web/src/components/IconButton/IconButton.tsx` → re-export stub
- `packages/web/src/components/SegmentedControl/SegmentedControl.tsx` → re-export stub
- `packages/web/src/components/ControlButton/ControlButton.tsx` → re-export stub
- `packages/web/src/components/ThemeToggle/ThemeToggle.tsx` → re-export stub
- `packages/web/src/components/BasemapToggle/BasemapToggle.tsx` → re-export stub
- `packages/web/src/components/SettingsMenu/SettingsMenu.tsx` → re-export stub
- `packages/web/src/constants/basemaps.ts` → re-export stub
- `packages/web/src/App.tsx` — wrap lazy MapView in DomainProvider, pass bounds + renderFeaturePopup
- `packages/web/package.json` — add `@stratum/map` dep

### Created by Task 3
- `packages/react/package.json`
- `packages/react/tsconfig.json`
- `packages/react/vitest.config.ts`
- `packages/react/vitest.setup.ts`
- `packages/react/src/index.ts`
- `packages/react/src/hooks/usePrefersDarkMode.ts`
- `packages/react/src/hooks/useThemePreference.ts` — with initTheme API
- `packages/react/src/hooks/usePrefersDarkMode.test.ts`
- `packages/react/src/hooks/useThemePreference.test.ts` — updated to use initTheme

### Modified by Task 3
- `packages/web/src/hooks/usePrefersDarkMode.ts` → re-export stub (test file deleted — moved to react)
- `packages/web/src/hooks/useThemePreference.ts` → re-export stub (test file deleted — moved to react; does NOT re-export THEME_COLOR or THEME_STORAGE_KEY)
- `packages/web/src/constants/themeConfig.ts` — new file with THEME_COLOR + THEME_STORAGE_KEY constants
- `packages/web/src/entry.client.tsx` — call initTheme before hydrateRoot
- `packages/web/package.json` — add `@stratum/react` dep

### Modified by Task 4
- `packages/shared/` renamed to `packages/app/`
- `packages/app/package.json` — name changed to `@stratum/app`
- `packages/app/src/domains/gauteng-spatial-legacy/layers.ts` — import Layer from `@stratum/core` (not relative stub)
- `packages/web/package.json` — remove `@stratum/shared`, add `@stratum/app`
- `data-pipeline/package.json` — change `@stratum/shared` to `@stratum/app`

### Modified by Task 5
- All files in `packages/web/src/` that import from relative stub paths → update to package imports
- All web files importing `@stratum/shared` → `@stratum/app` (or `@stratum/core` for Layer types)
- Remove all re-export stubs
- `packages/web/src/constants/layerStyles.ts` — remove `STATION_LAYER_IDS` (no longer needed)
- Root `package.json` `typecheck` script updated to include new packages

---

## Task 1: `@stratum/core`

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`
- Create: `packages/core/src/types/layer.ts`, `packages/core/src/layers/createLayerConfig.ts`, `packages/core/src/layers/createRegistry.ts`
- Create: `packages/core/src/data/fetchFeatureCollection.ts`, `packages/core/src/data/mergeFeatureCollections.ts`, `packages/core/src/data/geoJsonSchemas.ts`
- Create: `packages/core/src/index.ts` and all test files listed above
- Modify: `packages/shared/src/types/genericLayer.ts`, `packages/web/src/layers/createLayerConfig.ts`, `packages/web/src/data/fetchFeatureCollection.ts`, `packages/web/src/data/mergeFeatureCollections.ts`, `packages/web/src/data/geoJsonSchemas.ts`, `packages/web/src/layers/registry.ts`, `packages/web/package.json`
- Delete: `packages/web/src/layers/createLayerConfig.test.ts`, `packages/web/src/data/fetchFeatureCollection.test.ts`, `packages/web/src/data/mergeFeatureCollections.test.ts`

**Interfaces:**
- Produces: `createLayerConfig(layer: Layer, noDataColor?: string): LeafletLayerConfig`, `createRegistry(domain: DomainConfig): { getLayers, getLayer, getLayerGroups }`, `fetchFeatureCollection(url, schema?, signal?)`, `mergeFeatureCollections(collections)`, `featureCollectionSchema`, `createFeatureCollectionParser(schema, url)`, `polygonGeometrySchema`, `multiPolygonGeometrySchema`, all Layer/LayerGroup types with `hasPointGeometry?: boolean`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@stratum/core",
  "version": "1.0.0",
  "description": "Domain-agnostic layer model and geodata utilities",
  "license": "AGPL-3.0-only",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.14",
    "@types/leaflet": "^1.9.14"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/core/vitest.config.ts`**

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@stratum/core",
    environment: "node",
  },
});
```

- [ ] **Step 4: Write failing test for `Layer` type with `hasPointGeometry`**

Create `packages/core/src/types/layer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Layer } from "./layer";

describe("Layer type", () => {
  it("accepts a layer without hasPointGeometry", () => {
    const layer: Layer = {
      id: "bus",
      label: "Bus",
      dataSource: ["/data/gauteng/bus.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#CC79A7", weight: 3, legendLabel: "Bus" },
    };
    expect(layer.hasPointGeometry).toBeUndefined();
  });

  it("accepts a layer with hasPointGeometry: true", () => {
    const layer: Layer = {
      id: "rapid-rail",
      label: "Rapid Rail",
      dataSource: ["/data/gauteng/rapid-rail.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#E69F00", weight: 3, legendLabel: "Rapid Rail" },
      hasPointGeometry: true,
    };
    expect(layer.hasPointGeometry).toBe(true);
  });
});
```

Run: `npx vitest run packages/core/src/types/layer.test.ts`
Expected: FAIL — cannot find module `./layer`

- [ ] **Step 5: Create `packages/core/src/types/layer.ts`**

Copy the content of `packages/shared/src/types/genericLayer.ts` verbatim, then add `hasPointGeometry?: boolean` to the `Layer` interface and add JSDoc to all exported types:

```ts
/** The geometry rendering style for a GeoJSON layer. */
export type FeatureGeometryKind = "choropleth" | "line" | "point";

/** A single color bucket in a choropleth classification. */
export interface ColorBucket {
  /** Upper bound (inclusive) for this bucket. */
  max: number;
  /** CSS color string. */
  color: string;
  /** Human-readable label shown in the legend. */
  label: string;
}

/**
 * Style configuration for a choropleth layer.
 * @remarks Colors are resolved per-feature from `buckets` by reading `propertyKey`.
 */
export interface ChoroplethLayerStyle {
  kind: "choropleth";
  /** GeoJSON feature property whose numeric value drives color classification. */
  propertyKey: string;
  buckets: ColorBucket[];
  baseOpacity: number;
  emphasisOpacity?: number;
  /**
   * Optional resolver that returns `true` for features that should use
   * `emphasisOpacity` instead of `baseOpacity`. Receives `feature.properties`,
   * which may be `null` or `undefined`.
   */
  resolveEmphasis?: (
    properties: Record<string, unknown> | null | undefined,
  ) => boolean;
}

/** Style configuration for a line layer. */
export interface LineLayerStyle {
  kind: "line";
  color: string;
  weight: number;
  /** Label shown in the transit legend. */
  legendLabel: string;
}

/** Style configuration for a point/circle-marker layer. */
export interface PointLayerStyle {
  kind: "point";
  color: string;
  radius: number;
  legendLabel: string;
}

/** Union of all layer style configurations. */
export type LayerStyleConfig =
  | ChoroplethLayerStyle
  | LineLayerStyle
  | PointLayerStyle;

/** Interaction configuration for selectable features. */
export interface LayerInteraction {
  selectable: boolean;
  /** Feature property used as the accessible label. Defaults to `"name"`. */
  labelField?: string;
  popupFields?: string[];
}

/**
 * Platform-generic layer descriptor.
 * @remarks One `Layer` maps to one GeoJSON data source and one Leaflet layer.
 */
export interface Layer {
  id: string;
  label: string;
  description?: string;
  dataSource: readonly string[];
  /**
   * URL of a secondary GeoJSON file loaded alongside `dataSource` (e.g. area
   * boundary labels for a choropleth layer).
   */
  companionSource?: string;
  geometryKind: FeatureGeometryKind;
  defaultVisible: boolean;
  available: boolean;
  style: LayerStyleConfig;
  interaction?: LayerInteraction;
  /**
   * When `true`, this layer includes Point geometry (station/stop markers)
   * in addition to its primary geometry. Controls the dot icon in the
   * `@stratum/map` Legend component.
   */
  hasPointGeometry?: boolean;
}

/** Whether only one layer in the group can be active at a time. */
export type LayerGroupSelectionMode = "exclusive" | "independent";

/** Groups one or more layers for display and interaction in the UI. */
export interface LayerGroup {
  id: string;
  title: string;
  description?: string;
  selectionMode: LayerGroupSelectionMode;
  layerIds: string[];
}

/** Minimal domain configuration consumed by `createRegistry`. */
export interface DomainConfig {
  layers: readonly Layer[];
  layerGroups: readonly LayerGroup[];
}
```

Run: `npx vitest run packages/core/src/types/layer.test.ts`
Expected: PASS

- [ ] **Step 6: Write failing tests for `createRegistry`**

Create `packages/core/src/layers/createRegistry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DomainConfig } from "../types/layer";
import { createRegistry } from "./createRegistry";

const domain: DomainConfig = {
  layers: [
    {
      id: "a",
      label: "Layer A",
      dataSource: ["/data/a.geojson"],
      geometryKind: "line",
      defaultVisible: true,
      available: true,
      style: { kind: "line", color: "#000", weight: 1, legendLabel: "A" },
    },
    {
      id: "b",
      label: "Layer B",
      dataSource: ["/data/b.geojson"],
      geometryKind: "choropleth",
      defaultVisible: false,
      available: true,
      style: { kind: "choropleth", propertyKey: "value", buckets: [], baseOpacity: 0.5 },
    },
  ],
  layerGroups: [
    { id: "g1", title: "Group 1", selectionMode: "independent", layerIds: ["a"] },
  ],
};

describe("createRegistry", () => {
  it("getLayers returns all layers", () => {
    const { getLayers } = createRegistry(domain);
    expect(getLayers().map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("getLayer returns the matching layer by id", () => {
    const { getLayer } = createRegistry(domain);
    expect(getLayer("a")?.label).toBe("Layer A");
  });

  it("getLayer returns undefined for an unknown id", () => {
    const { getLayer } = createRegistry(domain);
    expect(getLayer("does-not-exist")).toBeUndefined();
  });

  it("getLayerGroups returns all groups", () => {
    const { getLayerGroups } = createRegistry(domain);
    expect(getLayerGroups().map((g) => g.id)).toEqual(["g1"]);
  });
});
```

Run: `npx vitest run packages/core/src/layers/createRegistry.test.ts`
Expected: FAIL — cannot find module `./createRegistry`

- [ ] **Step 7: Create `packages/core/src/layers/createRegistry.ts`**

```ts
import type { DomainConfig, Layer, LayerGroup } from "../types/layer";

/** The read-only accessor interface returned by `createRegistry`. */
export interface DomainRegistry {
  /** Returns all layers in the domain. */
  getLayers(): readonly Layer[];
  /** Returns the layer with the given id, or `undefined` if not found. */
  getLayer(id: string): Layer | undefined;
  /** Returns all layer groups in the domain. */
  getLayerGroups(): readonly LayerGroup[];
}

/**
 * Creates a read-only registry for a domain configuration.
 * @param domain - The domain whose layers and groups to expose.
 * @returns An object with `getLayers`, `getLayer`, and `getLayerGroups`.
 * @example
 * const { getLayers, getLayer, getLayerGroups } = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);
 */
export function createRegistry(domain: DomainConfig): DomainRegistry {
  return {
    getLayers: (): readonly Layer[] => domain.layers,
    getLayer: (id: string): Layer | undefined =>
      domain.layers.find((l) => l.id === id),
    getLayerGroups: (): readonly LayerGroup[] => domain.layerGroups,
  };
}
```

Run: `npx vitest run packages/core/src/layers/createRegistry.test.ts`
Expected: PASS

- [ ] **Step 8: Write failing tests for `createLayerConfig`**

Create `packages/core/src/layers/createLayerConfig.test.ts` — same test content as the current `packages/web/src/layers/createLayerConfig.test.ts`, with these import changes:

```ts
import type { Layer } from "@stratum/core";
import type { Feature } from "geojson";
import { describe, expect, it } from "vitest";
import { createLayerConfig } from "./createLayerConfig";
```

(All test bodies remain identical to the existing web test. The `"styles a choropleth feature with a missing value as no-data"` test must still assert `fillColor: "#8A93A5"` — the default `noDataColor` preserves this value.)

Run: `npx vitest run packages/core/src/layers/createLayerConfig.test.ts`
Expected: FAIL — cannot find module `./createLayerConfig`

- [ ] **Step 9: Create `packages/core/src/layers/createLayerConfig.ts`**

Copied from `packages/web/src/layers/createLayerConfig.ts` with two changes: remove the `CHOROPLETH_NO_DATA_COLOR` import and add a `noDataColor` parameter with default `"#8A93A5"`. Import `Layer` from `../types/layer` (not `@stratum/shared`).

```ts
import type { ColorBucket, Layer } from "../types/layer";
import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";

/** Leaflet path configuration for a single layer. */
export interface LeafletLayerConfig {
  pathOptions?: PathOptions & { noClip?: boolean };
  styleFn?: (feature?: Feature) => PathOptions;
}

function colorForValue(
  value: number | null,
  buckets: ColorBucket[],
  noDataColor: string,
): string {
  if (value === null) {
    return noDataColor;
  }
  const bucket = buckets.find((b) => value <= b.max);
  return bucket?.color ?? buckets[buckets.length - 1]?.color ?? noDataColor;
}

/**
 * Converts a `Layer` descriptor into a Leaflet path configuration object.
 * @param layer - The layer to configure.
 * @param noDataColor - CSS color used when a choropleth feature has no value.
 *   Defaults to `"#8A93A5"`.
 * @returns A `LeafletLayerConfig` with either `pathOptions` or `styleFn`.
 * @example
 * const { styleFn } = createLayerConfig(layer);
 * return <GeoJSON data={data} style={styleFn} />;
 */
export function createLayerConfig(
  layer: Layer,
  noDataColor = "#8A93A5",
): LeafletLayerConfig {
  const style = layer.style;

  switch (style.kind) {
    case "choropleth": {
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

Run: `npx vitest run packages/core/src/layers/createLayerConfig.test.ts`
Expected: PASS

- [ ] **Step 10: Write failing tests for `geoJsonSchemas`, `fetchFeatureCollection`, `mergeFeatureCollections`**

Create `packages/core/src/data/geoJsonSchemas.test.ts` — copy the `featureCollectionSchema` describe block and the `createFeatureCollectionParser` describe block from `packages/web/src/data/geoJsonSchemas.test.ts`. Import from `./geoJsonSchemas`.

Create `packages/core/src/data/fetchFeatureCollection.test.ts` — copy from `packages/web/src/data/fetchFeatureCollection.test.ts`. Import from `./fetchFeatureCollection`.

Create `packages/core/src/data/mergeFeatureCollections.test.ts` — copy from `packages/web/src/data/mergeFeatureCollections.test.ts`. Import from `./mergeFeatureCollections`.

Run: `npx vitest run packages/core/src/data/`
Expected: FAIL — cannot find modules

- [ ] **Step 11: Create the three core data files**

Create `packages/core/src/data/geoJsonSchemas.ts` — copy the generic portions from `packages/web/src/data/geoJsonSchemas.ts`: everything up to and including `featureCollectionSchema`, plus `FeatureCollectionParser`, `FeatureCollectionSchema`, and `createFeatureCollectionParser`. Export `polygonGeometrySchema` and `multiPolygonGeometrySchema` (they are currently not exported in web but are needed by web's township schema after the split). Add JSDoc to `createFeatureCollectionParser`:

```ts
import type { FeatureCollection } from "geojson";
import * as z from "zod/mini";

const positionSchema = z.array(z.number()).check(z.minLength(2));
const lineStringCoordinatesSchema = z.array(positionSchema).check(z.minLength(2));
const linearRingSchema = z.array(positionSchema).check(
  z.minLength(4),
  z.refine(
    (positions) => {
      const first = positions[0];
      const last = positions.at(-1);
      return (
        first !== undefined &&
        last !== undefined &&
        first.length === last.length &&
        first.every((coordinate, index) => coordinate === last[index])
      );
    },
    { message: "Polygon rings must be closed" },
  ),
);
const polygonCoordinatesSchema = z.array(linearRingSchema).check(z.minLength(1));

export const polygonGeometrySchema = z.looseObject({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinatesSchema,
});

export const multiPolygonGeometrySchema = z.looseObject({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoordinatesSchema).check(z.minLength(1)),
});

const geometrySchema = z.union([
  z.null(),
  z.looseObject({ type: z.literal("Point"), coordinates: positionSchema }),
  z.looseObject({ type: z.literal("MultiPoint"), coordinates: lineStringCoordinatesSchema }),
  z.looseObject({ type: z.literal("LineString"), coordinates: lineStringCoordinatesSchema }),
  z.looseObject({ type: z.literal("MultiLineString"), coordinates: z.array(lineStringCoordinatesSchema) }),
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

const propertiesSchema = z.union([z.null(), z.record(z.string(), z.unknown())]);

export const featureCollectionSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.looseObject({
      type: z.literal("Feature"),
      properties: propertiesSchema,
      geometry: geometrySchema,
    }),
  ),
});

export type FeatureCollectionParser = (input: unknown) => FeatureCollection;

export interface FeatureCollectionSchema {
  safeParse(input: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } };
}

/**
 * Creates a typed parser for a GeoJSON FeatureCollection.
 * @param schema - A Zod-compatible schema with a `safeParse` method.
 * @param url - The source URL, included in error messages for debugging.
 * @returns A function that parses `input` and throws on failure.
 * @remarks Error messages are truncated to the first 3 validation issues.
 * @example
 * const parse = createFeatureCollectionParser(townshipFeatureCollectionSchema, url);
 * const data = parse(await response.json());
 */
export function createFeatureCollectionParser(
  schema: FeatureCollectionSchema,
  url: string,
): FeatureCollectionParser {
  return (input) => {
    const result = schema.safeParse(input);
    if (result.success) {
      return result.data as FeatureCollection;
    }
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid GeoJSON from ${url}: ${issues}`);
  };
}
```

Create `packages/core/src/data/fetchFeatureCollection.ts`:

```ts
import type { FeatureCollection } from "geojson";
import {
  createFeatureCollectionParser,
  type FeatureCollectionSchema,
  featureCollectionSchema,
} from "./geoJsonSchemas";

/**
 * Fetches a GeoJSON FeatureCollection from `url` and validates it against `schema`.
 * @param url - The URL to fetch from.
 * @param schema - Zod-compatible schema. Defaults to the generic `featureCollectionSchema`.
 * @param signal - Optional `AbortSignal` to cancel the request.
 * @returns A validated `FeatureCollection`.
 * @remarks Throws `Error` on a non-2xx HTTP response (with status code) or on
 *   schema parse failure (with URL and up to 3 issue paths).
 */
export async function fetchFeatureCollection(
  url: string,
  schema: FeatureCollectionSchema = featureCollectionSchema,
  signal?: AbortSignal,
): Promise<FeatureCollection> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return createFeatureCollectionParser(schema, url)(await response.json());
}
```

Create `packages/core/src/data/mergeFeatureCollections.ts`:

```ts
import type { Feature, FeatureCollection } from "geojson";

/**
 * Concatenates the features from multiple FeatureCollections into one.
 * @param collections - Collections to merge, in order.
 * @returns A new `FeatureCollection` containing all features.
 */
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

Run: `npx vitest run packages/core/src/data/`
Expected: PASS

- [ ] **Step 12: Create `packages/core/src/index.ts`**

```ts
export * from "./types/layer";
export * from "./layers/createLayerConfig";
export * from "./layers/createRegistry";
export * from "./data/geoJsonSchemas";
export * from "./data/fetchFeatureCollection";
export * from "./data/mergeFeatureCollections";
```

- [ ] **Step 13: Turn web/shared files into re-export stubs**

**`packages/shared/src/types/genericLayer.ts`** — replace entire content with:
```ts
export type {
  FeatureGeometryKind,
  ColorBucket,
  ChoroplethLayerStyle,
  LineLayerStyle,
  PointLayerStyle,
  LayerStyleConfig,
  LayerInteraction,
  Layer,
  LayerGroupSelectionMode,
  LayerGroup,
  DomainConfig,
} from "@stratum/core";
```

**`packages/web/src/layers/createLayerConfig.ts`** — replace entire content with:
```ts
export { createLayerConfig } from "@stratum/core";
export type { LeafletLayerConfig } from "@stratum/core";
```

**`packages/web/src/data/fetchFeatureCollection.ts`** — replace entire content with:
```ts
export { fetchFeatureCollection } from "@stratum/core";
```

**`packages/web/src/data/mergeFeatureCollections.ts`** — replace entire content with:
```ts
export { mergeFeatureCollections } from "@stratum/core";
```

**`packages/web/src/data/geoJsonSchemas.ts`** — keep the township-specific schemas, replace all generic exports with re-exports from `@stratum/core`:

```ts
import type { FeatureCollection } from "geojson";
import * as z from "zod/mini";
import {
  createFeatureCollectionParser,
  featureCollectionSchema,
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
} from "@stratum/core";

export {
  featureCollectionSchema,
  createFeatureCollectionParser,
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
};
export type { FeatureCollectionParser, FeatureCollectionSchema } from "@stratum/core";

const townshipGeometrySchema = z.union([
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

const townshipPropertiesSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  population: z.optional(z.number()),
  commuteMinutes: z.nullable(z.number()),
  nearestJobCenter: z.string(),
  distanceKm: z.nullable(z.number()),
  nearestTransitKm: z.optional(z.nullable(z.number())),
});

export const townshipFeatureCollectionSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.looseObject({
      type: z.literal("Feature"),
      properties: townshipPropertiesSchema,
      geometry: townshipGeometrySchema,
    }),
  ),
});
```

**`packages/web/src/data/geoJsonSchemas.test.ts`** — remove the `featureCollectionSchema` and `createFeatureCollectionParser` describe blocks (now in core). Keep only the `townshipFeatureCollectionSchema` describe block. Update import to not import `featureCollectionSchema` or `createFeatureCollectionParser`.

**Delete** `packages/web/src/layers/createLayerConfig.test.ts` — tests moved to core.
**Delete** `packages/web/src/data/fetchFeatureCollection.test.ts` — tests moved to core.
**Delete** `packages/web/src/data/mergeFeatureCollections.test.ts` — tests moved to core.

- [ ] **Step 14: Update `packages/web/src/layers/registry.ts`**

```ts
import { createRegistry } from "@stratum/core";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/shared";
import type { Layer, LayerGroup } from "@stratum/core";

const registry = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);

export function getLayers(): readonly Layer[] {
  return registry.getLayers();
}

export function getLayer(id: string): Layer | undefined {
  return registry.getLayer(id);
}

export function getLayerGroups(): readonly LayerGroup[] {
  return registry.getLayerGroups();
}
```

- [ ] **Step 15: Add `@stratum/core` to `packages/web/package.json`**

Add to `dependencies`:
```json
"@stratum/core": "file:../core"
```

Run `npm install` from the repo root to create the workspace symlink.

- [ ] **Step 16: Run full test suite**

```bash
npm run test
```
Expected: all tests pass, including `@stratum/core`, `@stratum/shared`, and `@stratum/web`.

- [ ] **Step 17: Update CLAUDE.md and `.github/copilot-instructions.md`**

In both files, update the architecture section to add `@stratum/core` as the first package in the package list, with description: "domain-agnostic layer model (`Layer`, `LayerGroup`, style types), Leaflet config factory (`createLayerConfig`), registry factory (`createRegistry`), geodata utils (`fetchFeatureCollection`, `mergeFeatureCollections`, `geoJsonSchemas`)". Update the `typecheck` script description to note `@stratum/core` is included.

- [ ] **Step 18: Commit**

```bash
git add packages/core packages/shared/src/types/genericLayer.ts packages/web/src/layers/registry.ts packages/web/src/layers/createLayerConfig.ts packages/web/src/data/fetchFeatureCollection.ts packages/web/src/data/mergeFeatureCollections.ts packages/web/src/data/geoJsonSchemas.ts packages/web/src/data/geoJsonSchemas.test.ts packages/web/package.json CLAUDE.md .github/copilot-instructions.md
git rm packages/web/src/layers/createLayerConfig.test.ts packages/web/src/data/fetchFeatureCollection.test.ts packages/web/src/data/mergeFeatureCollections.test.ts
git commit -m "feat: extract @stratum/core with layer types, createRegistry, and geodata utils"
```

---

## Task 2: `@stratum/map`

**Files:**
- Create: all `packages/map/` files listed in the file structure section
- Modify: `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts` (add `hasPointGeometry`)
- Modify: web component files → re-export stubs; `packages/web/src/App.tsx`; `packages/web/package.json`
- Test: `packages/map/src/context/DomainContext.test.tsx`, `packages/map/src/components/MapView/MapView.test.tsx`, `packages/map/src/components/Legend/Legend.test.tsx`, existing component tests relocated

**Interfaces:**
- Consumes: `createRegistry`, `DomainConfig`, `Layer`, `LayerGroup` from `@stratum/core`
- Produces: `DomainProvider({ domain, children })`, `useDomain(): DomainRegistry`, `MapView({ bounds, visibleLayerIds, townships, townshipAreas?, basemap?, selectedFeatureId?, focusLocationTarget?, onFeatureSelect?, renderFeaturePopup? })`, `Legend({ mode?, visibleLayerIds?, compact? })`, `LocationSearchControl({ onLocationSelect, placeholder? })`

- [ ] **Step 1: Create `packages/map/package.json`**

```json
{
  "name": "@stratum/map",
  "version": "1.0.0",
  "description": "Generic map rendering and UI components for Stratum",
  "license": "AGPL-3.0-only",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@stratum/core": "file:../core",
    "leaflet": "^1.9.4",
    "lucide-react": "^1.27.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-leaflet": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.0.1",
    "@types/leaflet": "^1.9.14",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.4",
    "happy-dom": "^20.11.1",
    "typescript": "^6.0.3",
    "vite": "^8.1.5",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Create `packages/map/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/map/vite.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "@stratum/map",
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
```

- [ ] **Step 4: Create `packages/map/vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Write failing test for `DomainProvider` / `useDomain`**

Create `packages/map/src/context/DomainContext.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainProvider, useDomain } from "./DomainContext";
import type { DomainConfig } from "@stratum/core";

const domain: DomainConfig = {
  layers: [
    {
      id: "test-layer",
      label: "Test",
      dataSource: ["/data/test.geojson"],
      geometryKind: "line",
      defaultVisible: true,
      available: true,
      style: { kind: "line", color: "#000", weight: 1, legendLabel: "Test" },
    },
  ],
  layerGroups: [],
};

function Consumer() {
  const registry = useDomain();
  return <div data-testid="layer-id">{registry.getLayers()[0]?.id}</div>;
}

describe("DomainProvider / useDomain", () => {
  it("provides layer data to consumers", () => {
    render(
      <DomainProvider domain={domain}>
        <Consumer />
      </DomainProvider>,
    );
    expect(screen.getByTestId("layer-id")).toHaveTextContent("test-layer");
  });

  it("throws when useDomain is called outside a DomainProvider", () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Consumer />)).toThrow("useDomain must be used inside DomainProvider");
    console.error = consoleError;
  });
});
```

Run: `npx vitest run packages/map/src/context/DomainContext.test.tsx`
Expected: FAIL — cannot find module `./DomainContext`

- [ ] **Step 6: Create `packages/map/src/context/DomainContext.tsx`**

```tsx
import { createRegistry, type DomainConfig, type DomainRegistry } from "@stratum/core";
import { createContext, type ReactNode, useContext, useMemo } from "react";

const DomainContext = createContext<DomainRegistry | null>(null);

/**
 * Provides a `DomainRegistry` to all child components.
 * @remarks Any component that calls `useDomain()` must be a descendant of
 *   `DomainProvider`. Wrap the app root once with the domain configuration.
 * @example
 * <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
 *   <App />
 * </DomainProvider>
 */
export function DomainProvider({
  domain,
  children,
}: {
  domain: DomainConfig;
  children: ReactNode;
}) {
  const registry = useMemo(() => createRegistry(domain), [domain]);
  return <DomainContext value={registry}>{children}</DomainContext>;
}

/**
 * Returns the `DomainRegistry` provided by the nearest `DomainProvider`.
 * @throws If called outside of a `DomainProvider`.
 */
export function useDomain(): DomainRegistry {
  const registry = useContext(DomainContext);
  if (!registry) {
    throw new Error("useDomain must be used inside DomainProvider");
  }
  return registry;
}
```

Run: `npx vitest run packages/map/src/context/DomainContext.test.tsx`
Expected: PASS

- [ ] **Step 7: Add `hasPointGeometry: true` to rapid-rail and commuter-rail**

In `packages/shared/src/domains/gauteng-spatial-legacy/layers.ts`, add `hasPointGeometry: true` to the `rapid-rail` layer object (after `available: true`) and to the `commuter-rail` layer object.

Run the shared tests to confirm they still pass:
```bash
npx vitest run packages/shared/
```
Expected: PASS

- [ ] **Step 8: Copy all component and constant files to `packages/map/src/`**

Copy the following files verbatim from `packages/web/src/` to the corresponding paths under `packages/map/src/`:

- `constants/basemaps.ts` → `packages/map/src/constants/basemaps.ts`
- `data/locationSearch.ts` → `packages/map/src/data/locationSearch.ts`
- `components/DesktopLegend/DesktopLegend.tsx` → `packages/map/src/components/DesktopLegend/DesktopLegend.tsx`
- `components/DesktopLegend/DesktopLegend.module.css`
- `components/MobileLegend/MobileLegend.tsx` → `packages/map/src/components/MobileLegend/MobileLegend.tsx`
- `components/MobileLegend/MobileLegend.module.css`
- `components/IconButton/IconButton.tsx` → `packages/map/src/components/IconButton/IconButton.tsx`
- `components/SegmentedControl/SegmentedControl.tsx`
- `components/SegmentedControl/SegmentedControl.module.css`
- `components/ControlButton/ControlButton.tsx`
- `components/ThemeToggle/ThemeToggle.tsx`
- `components/BasemapToggle/BasemapToggle.tsx`
- `components/SettingsMenu/SettingsMenu.tsx`
- `components/MapView/MapView.module.css`

After copying, fix all relative imports in the map package files:
- Imports from `"../../hooks/useThemePreference"` → `"@stratum/react"` (will be a forward reference until Task 3; for now import from the web hook path via a temporary relative resolution — actually, since `@stratum/react` doesn't exist yet, add `@stratum/react` as an external package reference in `packages/map/package.json` devDependencies pointing at `"file:../react"` and create a minimal `packages/react/src/index.ts` stub that re-exports the hook from web. Alternatively, leave the import as `"@stratum/react"` and it will fail to resolve until Task 3 installs the package — but this will break tests. The safest option: in Task 2, copy `usePrefersDarkMode` and `useThemePreference` inline into map temporarily, with a TODO comment, then Task 3 replaces them with the package import.

Actually, simplest: create `packages/react` package structure in Task 3 which Task 2 depends on. Instead, structure map to import hooks from web via stub imports. Or better — just list `@stratum/react` as a devDep in map's package.json pointing to `file:../react`, and in Task 3 that file gets created. Task 2's tests don't test theme/dark-mode behavior so missing the react package won't break the map tests.

For simplicity in the plan: copy hooks inline for Task 2 with a `// TODO: replace with @stratum/react in Task 3` comment, then Task 3 removes the copies and adds the package dep.

Specifically, copy `usePrefersDarkMode.ts` into `packages/map/src/hooks/usePrefersDarkMode.ts` (as an interim copy), and in `MapView.tsx` import from `../hooks/usePrefersDarkMode` and `../hooks/useThemePreference`. Task 3 removes those copies and updates imports to `@stratum/react`.

Fix imports for `DesktopLegend` and `MobileLegend` that import from `Legend`:
- Change `"../Legend/Legend"` to the new map package path (same relative path still works since directory structure is identical).

Fix `ThemeToggle` import of `ThemePreference`:
- Change `"../../hooks/useThemePreference"` → `"../hooks/useThemePreference"` (interim map copy).

- [ ] **Step 9: Create `packages/map/src/constants/mapStyles.ts`**

```ts
/** Default stroke style for township boundary overlay lines. */
export const TOWNSHIP_OUTLINE = {
  color: "#F2EDE6",
  weight: 4,
} as const;
```

- [ ] **Step 10: Write failing test for genericised `Legend`**

Create `packages/map/src/components/Legend/Legend.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/shared";
import { describe, expect, it } from "vitest";
import { DomainProvider } from "../../context/DomainContext";
import { Legend } from "./Legend";

function withDomain(ui: React.ReactElement) {
  return (
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>{ui}</DomainProvider>
  );
}

describe("Legend", () => {
  it("renders each choropleth layer's bucket labels and colors from its style config", () => {
    render(withDomain(<Legend />));
    expect(screen.getByRole("list", { name: /Modeled car time/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /Distance to Nearest Transit/i })).toBeInTheDocument();
  });

  it("shows a No data swatch for every choropleth layer", () => {
    render(withDomain(<Legend />));
    expect(screen.getAllByText("No data")).toHaveLength(2);
    for (const entry of screen.getAllByText("No data")) {
      expect(entry.previousElementSibling).toHaveStyle({ backgroundColor: "#8A93A5" });
    }
  });

  it("renders one transit entry per line layer with label and color", () => {
    render(withDomain(<Legend />));
    expect(screen.getByText("Rapid Rail")).toBeInTheDocument();
    expect(screen.getByText("Rapid Rail").closest("li")).toHaveTextContent("line + stations");
    expect(screen.getByText("Bus").closest("li")).toHaveTextContent("route only");
  });

  it("marks rapid-rail and commuter-rail as line + stations via hasPointGeometry", () => {
    render(withDomain(<Legend />));
    expect(screen.getByText("Commuter Rail").closest("li")).toHaveTextContent("line + stations");
    expect(screen.getByText("Bus Rapid Transit").closest("li")).toHaveTextContent("route only");
  });

  it("in active mode, shows only visible layer sections", () => {
    render(withDomain(<Legend mode="active" visibleLayerIds={["townships"]} />));
    expect(screen.getByRole("list", { name: /Active map layers legend/i })).toBeInTheDocument();
    expect(screen.queryByText("Rapid Rail")).not.toBeInTheDocument();
  });

  it("shows empty-state message when no layers are active", () => {
    render(withDomain(<Legend mode="active" visibleLayerIds={[]} />));
    expect(screen.getByText("Turn on layers to view their legend.")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run packages/map/src/components/Legend/Legend.test.tsx`
Expected: FAIL — cannot find module `./Legend`

- [ ] **Step 11: Create genericised `packages/map/src/components/Legend/Legend.tsx`**

Copy `packages/web/src/components/Legend/Legend.tsx`, then:
- Remove imports of `STATION_LAYER_IDS` and `getLayers`
- Import `type Layer` from `@stratum/core`
- Import `useDomain` from `../../context/DomainContext`
- Change `choroplethLegends` and `getTransitEntries` to accept `layers: readonly Layer[]` parameter
- In the `Legend` component body, call `const { getLayers } = useDomain()` and `const layers = getLayers()`
- Pass `layers` to both helper functions
- Replace `STATION_LAYER_IDS.includes(layer.id)` with `layer.hasPointGeometry === true`
- Keep `CHOROPLETH_NO_DATA_COLOR = "#8A93A5"` as a local constant (not imported from web)

```tsx
import type { Layer } from "@stratum/core";
import { useDomain } from "../../context/DomainContext";
import styles from "./Legend.module.css";

const CHOROPLETH_NO_DATA_COLOR = "#8A93A5";

interface LegendProps {
  mode?: "all" | "active";
  visibleLayerIds?: string[];
  compact?: boolean;
}

function choroplethLegends(layers: readonly Layer[], visibleLayerIds?: string[]) {
  return layers.flatMap((layer) => {
    if (layer.style.kind !== "choropleth") {
      return [];
    }
    if (visibleLayerIds && !visibleLayerIds.includes(layer.id)) {
      return [];
    }
    return [
      {
        layer,
        entries: [
          ...layer.style.buckets,
          { label: "No data", color: CHOROPLETH_NO_DATA_COLOR },
        ],
      },
    ];
  });
}

function getTransitEntries(layers: readonly Layer[], visibleLayerIds?: string[]) {
  return layers.flatMap((layer) =>
    layer.available &&
    layer.style.kind === "line" &&
    (!visibleLayerIds || visibleLayerIds.includes(layer.id))
      ? [
          {
            label: layer.style.legendLabel,
            color: layer.style.color,
            hasStations: layer.hasPointGeometry === true,
          },
        ]
      : [],
  );
}

function getLegendAriaLabel(mode: "all" | "active", label: string) {
  if (mode === "active") {
    return `Active map layers legend: ${label}`;
  }
  return label;
}

/**
 * Renders choropleth and transit layer legend entries for a map domain.
 * @remarks Must be rendered inside a `DomainProvider`.
 */
export function Legend({
  mode = "all",
  visibleLayerIds = [],
  compact = false,
}: LegendProps) {
  const { getLayers } = useDomain();
  const layers = getLayers();
  const isActiveMode = mode === "active";
  const choroplethSections = choroplethLegends(isActiveMode ? layers : layers, isActiveMode ? visibleLayerIds : undefined);
  const transitEntries = getTransitEntries(layers, isActiveMode ? visibleLayerIds : undefined);
  const hasAnyLegendSection = choroplethSections.length > 0 || transitEntries.length > 0;

  return (
    <div className={styles.groups} data-compact={compact ? "true" : undefined}>
      {choroplethSections.map(({ layer, entries }) => (
        <div key={layer.id}>
          <h3 className={styles.groupTitle}>{layer.label}</h3>
          <ul
            className={styles.legend}
            aria-label={getLegendAriaLabel(mode, layer.description ?? layer.label)}
          >
            {entries.map((entry) => (
              <li key={entry.label} className={styles.entry}>
                <span className={styles.swatch} style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <span className={styles.label}>{entry.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {transitEntries.length > 0 ? (
        <div className={styles.fullWidthGroup}>
          <h3 className={styles.groupTitle}>Transit routes</h3>
          <ul className={styles.legend} aria-label={getLegendAriaLabel(mode, "Transit route colors")}>
            {transitEntries.map((entry) => (
              <li key={entry.label} className={styles.entry}>
                <span className={styles.symbolGroup} aria-hidden="true">
                  <span className={styles.lineSwatch} style={{ backgroundColor: entry.color }} />
                  {entry.hasStations ? (
                    <span className={styles.dotSwatch} style={{ backgroundColor: entry.color }} />
                  ) : null}
                </span>
                <span className={styles.label}>
                  {entry.label}
                  {entry.hasStations ? (
                    <span className={styles.symbolNote}> · line + stations</span>
                  ) : (
                    <span className={styles.symbolNote}> · route only</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!hasAnyLegendSection ? (
        <p className={styles.empty}>Turn on layers to view their legend.</p>
      ) : null}
    </div>
  );
}
```

Copy `packages/web/src/components/Legend/Legend.module.css` to `packages/map/src/components/Legend/Legend.module.css`.

Run: `npx vitest run packages/map/src/components/Legend/Legend.test.tsx`
Expected: PASS

- [ ] **Step 12: Write failing test for genericised `MapView`**

Create `packages/map/src/components/MapView/MapView.test.tsx` — copy the full content of `packages/web/src/components/MapView/MapView.test.tsx`, then:
- Add `import { DomainProvider } from "../../context/DomainContext";` and `import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/shared";`
- Change the import of `setThemePreference` to come from `"../hooks/useThemePreference"` (the interim map copy)
- Wrap all `render(<MapView .../>)` calls in:
  ```tsx
  render(
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
      <MapView bounds={[[-27.15, 27.1], [-25.3, 28.75]]} ... />
    </DomainProvider>
  )
  ```
- Add a test that `bounds` prop is used by `MapContainer`:
  ```tsx
  it("passes bounds to MapContainer", () => {
    const bounds: [[number, number], [number, number]] = [[-27.15, 27.1], [-25.3, 28.75]];
    render(
      <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />
      </DomainProvider>
    );
    expect(screen.getByTestId("map-container")).toHaveAttribute("data-has-bounds", "true");
  });
  ```
- Add a test that `renderFeaturePopup` is called when a feature is clicked (use the existing popup test scaffolding, pass a `renderFeaturePopup` prop instead of relying on the hardcoded `TownshipPopup`):
  ```tsx
  it("calls renderFeaturePopup with feature properties when a feature is clicked", async () => {
    const renderFeaturePopup = vi.fn().mockReturnValue(<div>Custom popup</div>);
    // ... setup with DomainProvider and bounds
    // ... trigger click on a feature layer
    // ... expect renderFeaturePopup to have been called
  });
  ```

Run: `npx vitest run packages/map/src/components/MapView/MapView.test.tsx`
Expected: FAIL — cannot find module `./MapView`

- [ ] **Step 13: Create genericised `packages/map/src/components/MapView/MapView.tsx`**

Copy `packages/web/src/components/MapView/MapView.tsx`, then make these changes:

1. Remove `import type { TownshipFeature, TownshipProperties } from "@stratum/shared"` — these are passed generically.
2. Add generic type parameter: `<TProperties extends Record<string, unknown> = Record<string, unknown>>`
3. Replace `GAUTENG_BOUNDS` constant with `bounds: [[number, number], [number, number]]` in `MapViewProps`.
4. Add `renderFeaturePopup?: (properties: TProperties) => ReactNode` to `MapViewProps`.
5. Remove `import { TownshipPopup }` from `"../TownshipPopup/TownshipPopup"`.
6. Import `useDomain` from `"../../context/DomainContext"`.
7. Replace `getLayers()` calls with `useDomain().getLayers()`.
8. Replace `import { TOWNSHIP_OUTLINE }` with `import { TOWNSHIP_OUTLINE } from "../../constants/mapStyles"`.
9. In `bindSelectedFeaturePopup`, use the passed `renderFeaturePopup` callback:
   ```ts
   function bindSelectedFeaturePopup<TProperties extends Record<string, unknown>>(
     featureLayer: SelectableFeatureLayer,
     properties: TProperties,
     renderFeaturePopup?: (properties: TProperties) => ReactNode,
   ) {
     if (featureLayer.getPopup?.()) {
       return;
     }
     if (renderFeaturePopup) {
       featureLayer.bindPopup?.(renderToStaticMarkup(renderFeaturePopup(properties)));
     }
   }
   ```
10. In `MapContainer`, replace `bounds={GAUTENG_BOUNDS}` with `bounds={bounds}`.
11. In `ResponsiveMapBounds`, replace the hardcoded `GAUTENG_BOUNDS` reference with a `bounds` prop passed down from `MapViewComponent`.
12. Fix all relative imports: hooks (from interim map copies), basemaps (from `../../constants/basemaps`), etc.
13. In imports, change `import type { Layer as DomainLayer }` to `import type { Layer as DomainLayer } from "@stratum/core"`.

Run: `npx vitest run packages/map/src/components/MapView/MapView.test.tsx`
Expected: PASS

- [ ] **Step 14: Move remaining component tests to `packages/map/`**

For each of `LocationSearchControl`, `IconButton`, `SegmentedControl`:
- Copy the test file from `packages/web/src/components/...` to `packages/map/src/components/...`
- Update imports from `"../../hooks/..."` to the interim map copies

Run: `npx vitest run packages/map/`
Expected: PASS

- [ ] **Step 15: Create `packages/map/src/index.ts`**

```ts
export { DomainProvider, useDomain } from "./context/DomainContext";
export type { DomainRegistry } from "./context/DomainContext";
export { Legend } from "./components/Legend/Legend";
export { DesktopLegend } from "./components/DesktopLegend/DesktopLegend";
export { MobileLegend } from "./components/MobileLegend/MobileLegend";
export { MapView } from "./components/MapView/MapView";
export { LocationSearchControl } from "./components/LocationSearchControl/LocationSearchControl";
export { IconButton } from "./components/IconButton/IconButton";
export { SegmentedControl } from "./components/SegmentedControl/SegmentedControl";
export { ControlButton } from "./components/ControlButton/ControlButton";
export { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
export { BasemapToggle } from "./components/BasemapToggle/BasemapToggle";
export { SettingsMenu } from "./components/SettingsMenu/SettingsMenu";
export { getBasemapTileSources } from "./constants/basemaps";
export type { Basemap } from "./constants/basemaps";
```

- [ ] **Step 16: Create re-export stubs in web for all moved components**

For each moved component/constant, replace its web file with a re-export stub. Example:

`packages/web/src/components/MapView/MapView.tsx`:
```ts
export { MapView } from "@stratum/map";
```

`packages/web/src/components/Legend/Legend.tsx`:
```ts
export { Legend } from "@stratum/map";
```

`packages/web/src/constants/basemaps.ts`:
```ts
export { getBasemapTileSources } from "@stratum/map";
export type { Basemap } from "@stratum/map";
```

Repeat for DesktopLegend, MobileLegend, LocationSearchControl, IconButton, SegmentedControl, ControlButton, ThemeToggle, BasemapToggle, SettingsMenu.

The web test files for the moved components can be deleted (they moved to map) or kept as pass-through stubs — delete is cleaner.

**Delete** from web: `LocationSearchControl.test.tsx`, `IconButton.test.tsx`, `SegmentedControl.test.tsx`.
The `MapView.test.tsx` and `Legend.test.tsx` in web must be updated (not deleted) because they also test web-specific integration behaviour.

Actually — the web `Legend.test.tsx` tests the same behavior as the map `Legend.test.tsx` now. Since web's `Legend` is a re-export stub, the web test would be testing the map package through the stub, which still works. But since all the logic is now in map, the web test is redundant. Delete it:
- **Delete** `packages/web/src/components/Legend/Legend.test.tsx`
- **Delete** `packages/web/src/components/MapView/MapView.test.tsx`

Keep the map package tests as the authoritative source.

- [ ] **Step 17: Update `packages/web/src/App.tsx` to pass `bounds` and `DomainProvider`**

The `MapView` is lazy-loaded in `App.tsx`. Since `MapView` now requires `bounds`, and uses `useDomain()` internally, wrap the lazy import section:

1. Add `import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/shared";` (already present via `METROS`).
2. Add `import { DomainProvider } from "./components/MapView/MapView"` — no, that's wrong. Import from `@stratum/map` directly (or via stub). Actually the stub `packages/web/src/components/MapView/MapView.tsx` only exports `MapView`. `DomainProvider` needs to be imported from `@stratum/map`.

Add `import { DomainProvider } from "@stratum/map";` to `App.tsx`.

3. Define `GAUTENG_BOUNDS` in `App.tsx`:
```ts
const GAUTENG_BOUNDS: [[number, number], [number, number]] = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];
```

4. Import `TownshipPopup` and `TownshipProperties` for the `renderFeaturePopup` callback:
```ts
import { TownshipPopup } from "./components/TownshipPopup/TownshipPopup";
import type { TownshipProperties } from "@stratum/shared";
```

5. Wrap the `<Suspense>` block (that contains `<MapView>`) with `<DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>`.

6. Add `bounds={GAUTENG_BOUNDS}` and `renderFeaturePopup={(props) => <TownshipPopup properties={props as TownshipProperties} />}` to the `<MapView>` call.

7. Update `LocationSearchControl` usage to pass `placeholder="Search town, suburb or station"`.

- [ ] **Step 18: Add `@stratum/map` to `packages/web/package.json`**

```json
"@stratum/map": "file:../map"
```

Run `npm install` from repo root.

- [ ] **Step 19: Run full test suite**

```bash
npm run test
```
Expected: all tests pass across all packages.

- [ ] **Step 20: Update CLAUDE.md and `.github/copilot-instructions.md`**

Add `@stratum/map` to the architecture section: "generic map rendering components (`MapView`, `Legend`, `DesktopLegend`, `MobileLegend`, `LocationSearchControl`, UI primitives), `DomainProvider` context, Leaflet-specific utilities". Document that `DomainProvider` must wrap any component tree that uses `useDomain()`.

- [ ] **Step 21: Commit**

```bash
git add packages/map packages/shared/src/domains/gauteng-spatial-legacy/layers.ts packages/web/src/components packages/web/src/constants/basemaps.ts packages/web/src/App.tsx packages/web/package.json CLAUDE.md .github/copilot-instructions.md
git commit -m "feat: extract @stratum/map with DomainProvider, genericised MapView and Legend"
```

---

## Task 3: `@stratum/react`

**Files:**
- Create: `packages/react/package.json`, `packages/react/tsconfig.json`, `packages/react/vitest.config.ts`, `packages/react/vitest.setup.ts`, `packages/react/src/index.ts`, `packages/react/src/hooks/usePrefersDarkMode.ts`, `packages/react/src/hooks/useThemePreference.ts`, both test files
- Create: `packages/web/src/constants/themeConfig.ts`
- Modify: `packages/web/src/hooks/usePrefersDarkMode.ts` → stub; `packages/web/src/hooks/useThemePreference.ts` → stub; `packages/web/src/entry.client.tsx`; `packages/web/package.json`
- Delete: `packages/web/src/hooks/usePrefersDarkMode.test.ts`, `packages/web/src/hooks/useThemePreference.test.ts`

**Interfaces:**
- Consumes: `react`, `usehooks-ts`
- Produces: `usePrefersDarkMode(): boolean`, `initTheme(config: ThemeConfig): void`, `useThemePreference(): ThemePreference`, `setThemePreference(preference: ThemePreference): void`, `ThemePreference`, `ThemeConfig`

- [ ] **Step 1: Create `packages/react/package.json`**

```json
{
  "name": "@stratum/react",
  "version": "1.0.0",
  "description": "Generic React hooks for Stratum applications",
  "license": "AGPL-3.0-only",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "dependencies": {
    "usehooks-ts": "^3.1.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^19.2.17",
    "happy-dom": "^20.11.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Create `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/react/vitest.config.ts`**

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@stratum/react",
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Create `packages/react/vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Write failing test for `usePrefersDarkMode`**

Create `packages/react/src/hooks/usePrefersDarkMode.test.ts` — copy from `packages/web/src/hooks/usePrefersDarkMode.test.ts` verbatim, changing only the import path:
```ts
import { usePrefersDarkMode } from "./usePrefersDarkMode";
```

Run: `npx vitest run packages/react/src/hooks/usePrefersDarkMode.test.ts`
Expected: FAIL — cannot find module `./usePrefersDarkMode`

- [ ] **Step 6: Create `packages/react/src/hooks/usePrefersDarkMode.ts`**

```ts
import { useMediaQuery } from "usehooks-ts";

const QUERY = "(prefers-color-scheme: dark)";

/**
 * Returns `true` when the user's OS preference is dark mode.
 * @remarks Initialises to `false` on first render to avoid SSR mismatch.
 */
export function usePrefersDarkMode() {
  return useMediaQuery(QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
}
```

Run: `npx vitest run packages/react/src/hooks/usePrefersDarkMode.test.ts`
Expected: PASS

- [ ] **Step 7: Write failing test for `useThemePreference` with `initTheme`**

Create `packages/react/src/hooks/useThemePreference.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

async function importFreshModule() {
  vi.resetModules();
  return import("./useThemePreference");
}

const TEST_COLORS = { light: "#edeff2", dark: "#23262c" };

describe("useThemePreference theme-color meta sync", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head.innerHTML = "";
  });

  it("has no override meta tag for the system preference", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("does not mutate document head on module import", async () => {
    await importFreshModule();
    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
  });

  it("sets an override meta tag and data-theme attribute for dark", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", TEST_COLORS.dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("sets an override meta tag and data-theme attribute for light", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("light");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", TEST_COLORS.light);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("removes the override meta tag when switching back to system", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("updates the existing override meta tag instead of creating a new one", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");
    setThemePreference("light");

    const metas = document.querySelectorAll(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute("content", TEST_COLORS.light);
  });

  it("notifies subscribers when the preference changes", async () => {
    const { setThemePreference, initTheme, useThemePreference } =
      await importFreshModule();
    const { act, renderHook } = await import("@testing-library/react");
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });

    const { result } = renderHook(() => useThemePreference());
    expect(result.current).toBe("system");

    act(() => {
      setThemePreference("dark");
    });

    expect(result.current).toBe("dark");
  });

  it("uses fallback colors when initTheme has not been called", async () => {
    const { setThemePreference } = await importFreshModule();
    // No initTheme call — should use fallback
    setThemePreference("dark");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", "#000000");
  });
});
```

Run: `npx vitest run packages/react/src/hooks/useThemePreference.test.ts`
Expected: FAIL — cannot find module `./useThemePreference`

- [ ] **Step 8: Create `packages/react/src/hooks/useThemePreference.ts`**

```ts
import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

/** Configuration for the theme preference system. */
export interface ThemeConfig {
  /** localStorage key used to persist the preference. */
  storageKey: string;
  /** CSS color values used in the `<meta name="theme-color">` tag. */
  colors: { light: string; dark: string };
}

const DEFAULT_CONFIG: ThemeConfig = {
  storageKey: "stratum-theme",
  colors: { light: "#ffffff", dark: "#000000" },
};

let config: ThemeConfig = DEFAULT_CONFIG;

/**
 * Configures the theme preference system with app-specific values.
 * @param themeConfig - The storage key and colour values to use.
 * @remarks Call once at app bootstrap before any component renders.
 * @example
 * initTheme({ storageKey: "stratum-theme", colors: THEME_COLOR });
 */
export function initTheme(themeConfig: ThemeConfig): void {
  config = themeConfig;
}

const THEME_COLOR_OVERRIDE_ATTR = "data-theme-override";

function isExplicitTheme(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(config.storageKey);
  return isExplicitTheme(stored) ? stored : "system";
}

function syncThemeColorMeta(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }
  const existingOverride = document.querySelector(
    `meta[name="theme-color"][${THEME_COLOR_OVERRIDE_ATTR}]`,
  );
  if (preference === "system") {
    existingOverride?.remove();
    return;
  }
  const content = config.colors[preference];
  if (existingOverride) {
    existingOverride.setAttribute("content", content);
    return;
  }
  const override = document.createElement("meta");
  override.setAttribute("name", "theme-color");
  override.setAttribute("content", content);
  override.setAttribute(THEME_COLOR_OVERRIDE_ATTR, "");
  document.head.prepend(override);
}

function applyThemeAttribute(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
  syncThemeColorMeta(preference);
}

let currentPreference: ThemePreference = "system";
if (typeof window !== "undefined") {
  currentPreference = readStoredPreference();
}
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentPreference;
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

/**
 * Sets the user's theme preference, persists it to localStorage, and updates
 * the document's `data-theme` attribute and theme-color meta tag.
 * @param preference - `"system"` removes any explicit override.
 */
export function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  if (typeof window !== "undefined") {
    if (preference === "system") {
      localStorage.removeItem(config.storageKey);
    } else {
      localStorage.setItem(config.storageKey, preference);
    }
  }
  applyThemeAttribute(preference);
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Returns the current theme preference, updating reactively when it changes.
 * @remarks Call `initTheme` before any component using this hook mounts.
 */
export function useThemePreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

Run: `npx vitest run packages/react/src/hooks/useThemePreference.test.ts`
Expected: PASS

- [ ] **Step 9: Create `packages/react/src/index.ts`**

```ts
export { usePrefersDarkMode } from "./hooks/usePrefersDarkMode";
export {
  useThemePreference,
  setThemePreference,
  initTheme,
} from "./hooks/useThemePreference";
export type { ThemePreference, ThemeConfig } from "./hooks/useThemePreference";
```

- [ ] **Step 10: Create `packages/web/src/constants/themeConfig.ts`**

```ts
export const THEME_COLOR = {
  light: "#edeff2",
  dark: "#23262c",
} as const;

export const THEME_STORAGE_KEY = "stratum-theme";
```

- [ ] **Step 11: Create re-export stubs in web for both hooks**

`packages/web/src/hooks/usePrefersDarkMode.ts`:
```ts
export { usePrefersDarkMode } from "@stratum/react";
```

`packages/web/src/hooks/useThemePreference.ts`:
```ts
export {
  useThemePreference,
  setThemePreference,
  initTheme,
} from "@stratum/react";
export type { ThemePreference } from "@stratum/react";
```

**Delete** `packages/web/src/hooks/usePrefersDarkMode.test.ts` — moved to `@stratum/react`.
**Delete** `packages/web/src/hooks/useThemePreference.test.ts` — moved to `@stratum/react`.

- [ ] **Step 12: Update `packages/web/src/entry.client.tsx` to call `initTheme`**

```tsx
import { initTheme } from "./hooks/useThemePreference";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./constants/themeConfig";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR });
hydrateRoot(document, <HydratedRouter />);
```

- [ ] **Step 13: Also update `packages/map/src/hooks/useThemePreference.ts` (the interim copy from Task 2)**

Replace the interim map hook copy with a re-export stub pointing to `@stratum/react`:
```ts
export { useThemePreference, setThemePreference, initTheme } from "@stratum/react";
export type { ThemePreference } from "@stratum/react";
```

Add `@stratum/react` to `packages/map/package.json` dependencies:
```json
"@stratum/react": "file:../react"
```

Run `npm install` from repo root.

- [ ] **Step 14: Add `@stratum/react` to `packages/web/package.json`**

```json
"@stratum/react": "file:../react"
```

Run `npm install` from repo root.

- [ ] **Step 15: Run full test suite**

```bash
npm run test
```
Expected: PASS across all packages including `@stratum/react`.

- [ ] **Step 16: Update CLAUDE.md and `.github/copilot-instructions.md`**

Add `@stratum/react` to the architecture section: "generic React hooks — `usePrefersDarkMode` and `useThemePreference` with `initTheme` / `setThemePreference`". Note that `THEME_COLOR` and `THEME_STORAGE_KEY` are now app-specific constants in `packages/web/src/constants/themeConfig.ts`.

- [ ] **Step 17: Commit**

```bash
git add packages/react packages/web/src/hooks/ packages/web/src/constants/themeConfig.ts packages/web/src/entry.client.tsx packages/map/src/hooks/ packages/map/package.json packages/web/package.json CLAUDE.md .github/copilot-instructions.md
git rm packages/web/src/hooks/usePrefersDarkMode.test.ts packages/web/src/hooks/useThemePreference.test.ts
git commit -m "feat: extract @stratum/react with usePrefersDarkMode and configurable useThemePreference"
```

---

## Task 4: Rename `packages/shared` → `packages/app`

**Files:**
- `packages/app/` — all content copied from `packages/shared/`, name updated to `@stratum/app`
- `packages/shared/` — deleted
- `packages/web/package.json` — swap `@stratum/shared` for `@stratum/app`
- `data-pipeline/package.json` — swap `@stratum/shared` for `@stratum/app`
- All `import from "@stratum/shared"` in `packages/web/src/` → `@stratum/app`

**Interfaces:**
- Consumes: `@stratum/core` (via re-export stub in genericLayer.ts, which already exists from Task 1)
- Produces: same exports as before under the new name `@stratum/app`

- [ ] **Step 1: Copy `packages/shared/` to `packages/app/`**

```bash
cp -r packages/shared packages/app
```

- [ ] **Step 2: Update `packages/app/package.json`**

Change `"name": "@stratum/shared"` to `"name": "@stratum/app"`. No other changes needed — the re-export stubs and tests are identical.

- [ ] **Step 3: Update `packages/app/src/domains/gauteng-spatial-legacy/layers.ts` import**

The file currently imports `Layer` from `"../../types/genericLayer"` (relative). `../../types/genericLayer` is the stub that re-exports from `@stratum/core`. Change the import to read directly from `@stratum/core`:

```ts
import type { Layer } from "@stratum/core";
```

This removes the dependency on the stub file within the package.

- [ ] **Step 4: Update `packages/web/package.json`**

Remove: `"@stratum/shared": "file:../shared"`
Add: `"@stratum/app": "file:../app"`

- [ ] **Step 5: Update all `@stratum/shared` imports in `packages/web/src/`**

Run a global find-and-replace in `packages/web/src/`:
- `from "@stratum/shared"` → `from "@stratum/app"`

Files affected (based on current codebase): `App.tsx`, `layers/registry.ts`, `data/TownshipDataRepository.ts`, `data/regionDataUrls.ts`, `hooks/useLayerData.ts`, and any others that import from `@stratum/shared`.

Verify no remaining references:
```bash
grep -r '"@stratum/shared"' packages/web/src/
```
Expected: no output.

- [ ] **Step 6: Update `data-pipeline/package.json`**

Change `"@stratum/shared": "file:../packages/shared"` to `"@stratum/app": "file:../packages/app"`.

Update any `import from "@stratum/shared"` in `data-pipeline/src/` to `from "@stratum/app"`:
```bash
grep -r '"@stratum/shared"' data-pipeline/src/
```
Replace all occurrences.

- [ ] **Step 7: Delete `packages/shared/`**

```bash
rm -rf packages/shared
```

- [ ] **Step 8: Run `npm install` from repo root**

```bash
npm install
```

This updates workspace symlinks to reflect the new `packages/app` directory.

- [ ] **Step 9: Run full test suite**

```bash
npm run test
```
Expected: PASS across `@stratum/core`, `@stratum/app`, `@stratum/map`, `@stratum/react`, `@stratum/web`.

- [ ] **Step 10: Update CLAUDE.md and `.github/copilot-instructions.md`**

Replace all references to `packages/shared` / `@stratum/shared` with `packages/app` / `@stratum/app`. Update description: "`@stratum/app` — Gauteng-specific constants (metros, regions, townships, transit layer IDs), domain data (`GAUTENG_SPATIAL_LEGACY_DOMAIN`), and Gauteng-specific GeoJSON type definitions".

Update the root `typecheck` script in CLAUDE.md to show `@stratum/app` instead of `@stratum/shared`.

- [ ] **Step 11: Commit**

```bash
git add packages/app packages/web/package.json packages/web/src/ data-pipeline/ CLAUDE.md .github/copilot-instructions.md
git rm -r packages/shared
git commit -m "feat: rename @stratum/shared to @stratum/app"
```

---

## Task 5: Clean up `packages/web` — final import updates

**Files:**
- All re-export stubs in `packages/web/src/` removed; callers updated to use package imports directly
- `packages/web/src/layers/registry.ts` — keep as-is (it delegates to core's `createRegistry`)
- `packages/web/src/constants/layerStyles.ts` — remove `STATION_LAYER_IDS` (no longer used)
- `packages/web/package.json` — remove any now-unused deps if applicable
- Root `package.json` `typecheck` script — add `@stratum/core`, `@stratum/map`, `@stratum/react`, `@stratum/app`

**Interfaces:**
- Consumes: all four new packages
- Produces: a passing `npm run test`, `npm run typecheck`, and `npm run build`

- [ ] **Step 1: Remove stub files and update callers**

For each re-export stub created in Tasks 1–3, find all files in `packages/web/src/` that import from the stub's path and update them to import from the correct package.

Work through each stub:

**`packages/web/src/layers/createLayerConfig.ts`** (stub → `@stratum/core`):
```bash
grep -r "from.*layers/createLayerConfig" packages/web/src/
```
Update those imports to `import { createLayerConfig } from "@stratum/core"`.
Delete `packages/web/src/layers/createLayerConfig.ts`.

**`packages/web/src/data/fetchFeatureCollection.ts`** (stub → `@stratum/core`):
```bash
grep -r "from.*data/fetchFeatureCollection" packages/web/src/
```
Update imports to `from "@stratum/core"`. Delete the stub.

**`packages/web/src/data/mergeFeatureCollections.ts`** (stub → `@stratum/core`):
Update callers to `from "@stratum/core"`. Delete the stub.

**`packages/web/src/data/geoJsonSchemas.ts`** — keep this file (it still contains the township-specific schemas). Update any import of generic schemas from this file to use `@stratum/core` directly.

**Component stubs in `packages/web/src/components/`**: For each stub, find callers and update them to import from `@stratum/map`. Then delete the stub files. Exception: `MapView` is lazy-imported in `App.tsx` — update the dynamic import to use `@stratum/map`:
```ts
const MapView = lazy(async () => {
  const { MapView } = await import("@stratum/map");
  return { default: MapView };
});
```

**Hook stubs in `packages/web/src/hooks/`**: Find callers and update to `@stratum/react`. Delete stub files.

**`packages/web/src/constants/basemaps.ts`** (stub → `@stratum/map`): Update callers, delete stub.

- [ ] **Step 2: Remove `STATION_LAYER_IDS` from `packages/web/src/constants/layerStyles.ts`**

```bash
grep -r "STATION_LAYER_IDS" packages/web/src/
```

After removing `Legend.tsx` from web (it's now a stub pointing to map), `STATION_LAYER_IDS` should have no consumers. Verify, then delete it from `layerStyles.ts`.

- [ ] **Step 3: Update root `package.json` typecheck script**

```json
"typecheck": "npm run typecheck --workspace @stratum/core && npm run typecheck --workspace @stratum/app && npm run typecheck --workspace @stratum/map && npm run typecheck --workspace @stratum/react && npm run build --workspace @stratum/web && npm run typecheck --prefix data-pipeline"
```

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```
Expected: PASS

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 6: Run build**

```bash
npm run build
```
Expected: PASS — identical output to before the refactor.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/ packages/web/package.json package.json
git commit -m "refactor: remove re-export stubs, update web to import from SDK packages directly"
```

---

## Final Documentation Pass

**Files:**
- `packages/core/README.md` — new
- `packages/map/README.md` — new
- `packages/react/README.md` — new
- `packages/app/README.md` — new
- Root `README.md` — update Documentation and Stack sections
- `CONTRIBUTING.md` — update project structure section

- [ ] **Step 1: Create `packages/core/README.md`**

Content: what belongs (domain-agnostic types — `Layer`, `LayerGroup`, all style types; `createLayerConfig`; `createRegistry`; `fetchFeatureCollection`; `mergeFeatureCollections`; generic GeoJSON schemas); what doesn't (React, Leaflet runtime, Gauteng-specific data).

- [ ] **Step 2: Create `packages/map/README.md`**

Content: what belongs (`MapView`, `Legend`, `DesktopLegend`, `MobileLegend`, `LocationSearchControl`, UI primitives, `DomainProvider`/`useDomain`, `getBasemapTileSources`); what doesn't (township-specific components like `TownshipBrowser`/`TownshipPopup`, Gauteng domain data).

- [ ] **Step 3: Create `packages/react/README.md`**

Content: what belongs (`usePrefersDarkMode`, `useThemePreference`/`initTheme`/`setThemePreference`); what doesn't (Leaflet, domain data, app-specific config — pass those via `initTheme`).

- [ ] **Step 4: Create `packages/app/README.md`**

Content: what belongs (Gauteng metros, regions, townships, transit layer IDs, `GAUTENG_SPATIAL_LEGACY_DOMAIN`); what doesn't (generic types — those live in `@stratum/core`, map components, hooks).

- [ ] **Step 5: Update root `README.md`**

Update the package list in the Documentation/Stack section to reflect the five-package structure.

- [ ] **Step 6: Update `CONTRIBUTING.md`**

Update any project structure description to reflect the five packages.

- [ ] **Step 7: Grep for stale references**

```bash
grep -r "packages/shared\|@stratum/shared" . --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json" --exclude-dir=node_modules
```
Expected: no output. Fix any remaining references.

- [ ] **Step 8: Commit**

```bash
git add packages/core/README.md packages/map/README.md packages/react/README.md packages/app/README.md README.md CONTRIBUTING.md
git commit -m "docs: add package READMEs and update root docs for five-package structure"
```
