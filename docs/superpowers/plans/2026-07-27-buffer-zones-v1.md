# Buffer Zones v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real, working Buffer Zones app for Pretoria/Tshwane — a Leaflet choropleth map showing real drive-time-to-nearest-job-center (Pretoria CBD, Menlyn, Centurion, Rosslyn, Hatfield, or Waterkloof/Brooklyn) and real Gautrain/A Re Yeng transit overlays, computed from real data by an offline pipeline, served as a static SPA with no backend.

**Architecture:** npm workspaces (`packages/web`, `packages/shared`) plus a non-workspace `data-pipeline` directory (Node/TS scripts, run manually, output committed as static GeoJSON). The pipeline uses the public OSRM demo server (no Docker) and npm-only shapefile tooling (no system GDAL). The web app is a Vite + React + TypeScript SPA using `react-leaflet`, CSS Modules, and a layer-registry pattern so new layers require no changes to the map component. No `/api` route, no AI chat — confirmed out of scope per the approved design doc.

**Tech Stack:** TypeScript everywhere, React 18 + `react-leaflet` + Leaflet, Vite, CSS Modules, `clsx`, Fontsource + Fontaine, `lucide-react`, Biome, Lefthook, Vitest + React Testing Library + happy-dom, `@turf/turf` + `shapefile` (npm, no GDAL) for the pipeline, `tsx` to run pipeline TS directly, Cloudflare Workers static assets for deploy (not run this session).

## Global Constraints

- No `any` types — unknown external shapes are typed `unknown` and narrowed, or given an explicit `RawXxxFeature` interface (design doc §3, SPEC.md §12).
- `interface` for domain shapes (`LayerDefinition`, `TownshipProperties`, `TransitStop`); `type` for unions/derived types (`LayerId`, `LayerStyle`); `enum` only for iterated/lookup-keyed sets (`CommuteBucket`); `const`/`as const` for literal config (SPEC.md §12).
- No Docker, no system GDAL/`ogr2ogr` — pipeline uses public `router.project-osrm.org` and npm `shapefile`/`@turf/turf` only (design doc §2, §4).
- Pretoria/Tshwane scope only for real data this session; other metros/operators get typed stub adapters + registry entries, no fabricated data (design doc §2, §4, §8).
- Six real job centers this session — Pretoria CBD, Menlyn, Centurion, Rosslyn, Hatfield, and Waterkloof/Brooklyn — each township is tagged with whichever is closer by drive time, not a single fixed destination.
- No `/api` route, no Workers AI, no chat UI, no chat-related CSP/privacy text (design doc §2, §6).
- Never fabricate numbers: if a real unemployment data source isn't found in usable form, the layer ships as an explicit empty/"not yet available" state, not invented figures (design doc §4, §8).
- TDD: write the failing test before the implementation for every unit listed below (SPEC.md §4).
- AGPL-3.0 license; dependency license compatibility already checked in SPEC.md §9 — don't add a dependency with an incompatible license without re-checking.
- Don't run `wrangler deploy` this session (design doc §2, §6).

---

## File Structure

```
/
├── package.json                       # workspace root
├── biome.jsonc
├── lefthook.yml
├── tsconfig.base.json
├── .gitignore
├── LICENSE                            # AGPL-3.0 full text
├── ATTRIBUTIONS.md
├── PRIVACY.md
├── wrangler.jsonc
├── docs/superpowers/{specs,plans}/
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/types/
│   │       ├── layer.ts               # LayerId, LayerType, LayerDefinition, LayerStyle
│   │       ├── township.ts            # TownshipProperties, TownshipFeature
│   │       └── transit.ts             # TransitStop, TransitLayerFeatureCollection
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── vitest.setup.ts
│       ├── index.html
│       ├── public/data/               # townships.v1.geojson, gautrain.v1.geojson, a-re-yeng.v1.geojson
│       └── src/
│           ├── main.tsx
│           ├── App.tsx / App.module.css
│           ├── constants/colorScale.ts
│           ├── utils/{colorScale.ts, formatCommuteTime.ts}
│           ├── data/TownshipDataRepository.ts
│           ├── layers/{registry.ts, createLayerConfig.ts}
│           └── components/
│               ├── Map/Map.tsx
│               ├── Legend/Legend.tsx
│               ├── TownshipPopup/TownshipPopup.tsx
│               ├── LayerToggles/LayerToggles.tsx
│               └── BasemapToggle/BasemapToggle.tsx
└── data-pipeline/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── constants/jobCenters.ts    # Pretoria CBD, Menlyn, Centurion, Rosslyn, Hatfield, Waterkloof/Brooklyn
        ├── osrmClient.ts
        ├── adapters/
        │   ├── boundaries.ts          # Tshwane sub-place source
        │   ├── gautrain.ts
        │   ├── aReYeng.ts
        │   ├── unemployment.ts
        │   └── stubTransitLayer.ts    # myciti, prasa, rea-vaya, metrobus, durban-transport
        ├── join.ts
        ├── export.ts
        └── run.ts
```

---

### Task 1: Workspace scaffold, tooling config, shared types package

**Files:**
- Create: `package.json`, `biome.jsonc`, `lefthook.yml`, `tsconfig.base.json`, `.gitignore`, `LICENSE`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types/layer.ts`, `packages/shared/src/types/township.ts`, `packages/shared/src/types/transit.ts`
- Test: `packages/shared/src/types/layer.test.ts` (type-level smoke test only — see step 1)

**Interfaces:**
- Produces: `LayerId` (type union), `LayerType` (type union), `LayerDefinition` (interface), `TownshipProperties` (interface), `TownshipFeature` (type = `GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, TownshipProperties>`), `TransitStop` (interface), `TransitLayerFeatureCollection` (type).

- [ ] **Step 1: Write the failing test**

There's no runtime behavior yet, so the "test" is a type-checking smoke test that fails to compile because the types don't exist:

```typescript
// packages/shared/src/types/layer.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type { LayerDefinition, LayerId, LayerType } from "./layer";

describe("LayerDefinition", () => {
  it("accepts a valid choropleth layer definition", () => {
    const def: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
    };
    expectTypeOf(def.id).toEqualTypeOf<LayerId>();
    expectTypeOf(def.layerType).toEqualTypeOf<LayerType>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build --workspace=packages/shared` (or `npx vitest run packages/shared/src/types/layer.test.ts` once vitest is installed in step 5)
Expected: FAIL — `Cannot find module './layer'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/shared/src/types/layer.ts
export type LayerId =
  | "townships"
  | "gautrain"
  | "a-re-yeng"
  | "unemployment"
  | "myciti"
  | "prasa"
  | "rea-vaya"
  | "metrobus"
  | "durban-transport";

export type LayerType = "choropleth" | "line" | "point";

export interface ChoroplethStyle {
  kind: "choropleth";
  propertyKey: string;
}

export interface LineStyle {
  kind: "line";
  color: string;
  weight: number;
}

export interface PointStyle {
  kind: "point";
  color: string;
  radius: number;
}

export type LayerStyle = ChoroplethStyle | LineStyle | PointStyle;

export interface LayerDefinition {
  id: LayerId;
  label: string;
  dataSource: string;
  layerType: LayerType;
  defaultVisible: boolean;
  style?: LayerStyle;
}
```

```typescript
// packages/shared/src/types/township.ts
import type { Feature, MultiPolygon, Polygon } from "geojson";

export interface TownshipProperties {
  id: string;
  name: string;
  population?: number;
  commuteMinutes: number | null;
  nearestJobCenter: string;
  distanceKm: number | null;
  unemploymentRatePercent: number | null;
  nearestGautrainStationKm: number | null;
  nearestAReYengStopKm: number | null;
}

export type TownshipFeature = Feature<Polygon | MultiPolygon, TownshipProperties>;
```

```typescript
// packages/shared/src/types/transit.ts
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export interface TransitStop {
  id: string;
  name: string;
  network: string;
}

export type TransitLineFeature = Feature<LineString, TransitStop>;
export type TransitStopFeature = Feature<Point, TransitStop>;
export type TransitLayerFeatureCollection = FeatureCollection<
  LineString | Point,
  TransitStop
>;
```

```json
// packages/shared/package.json
{
  "name": "@buffer-zones/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "geojson": "^0.5.0"
  }
}
```

```typescript
// packages/shared/src/index.ts
export * from "./types/layer";
export * from "./types/township";
export * from "./types/transit";
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true
  }
}
```

```json
// package.json (workspace root)
{
  "name": "buffer-zones",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest run",
    "build": "npm run build --workspaces --if-present"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "lefthook": "^1.7.0"
  }
}
```

```jsonc
// biome.jsonc
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "files": { "ignore": ["dist", "node_modules", "data-pipeline/output"] }
}
```

```yaml
# lefthook.yml
pre-commit:
  commands:
    biome:
      run: npx biome check {staged_files}
    test:
      run: npx vitest run
```

```
# .gitignore
node_modules
dist
.wrangler
*.log
data-pipeline/downloads/
```

For LICENSE, fetch the canonical AGPL-3.0 text (`https://www.gnu.org/licenses/agpl-3.0.txt`) and save verbatim to `LICENSE` — this is required license text, not something to paraphrase.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install && npx vitest run packages/shared/src/types/layer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json biome.jsonc lefthook.yml tsconfig.base.json .gitignore LICENSE packages/shared
git commit -m "chore: scaffold workspace and shared type package"
```

---

### Task 2: Data-pipeline scaffold, job centers constant, OSRM client (multi-destination nearest)

**Files:**
- Create: `data-pipeline/package.json`, `data-pipeline/tsconfig.json`
- Create: `data-pipeline/src/constants/jobCenters.ts`
- Create: `data-pipeline/src/osrmClient.ts`
- Test: `data-pipeline/src/osrmClient.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `JOB_CENTERS` (const array of `{ id: string; name: string; lat: number; lon: number }`, six entries: Pretoria CBD, Menlyn, Centurion, Rosslyn, Hatfield, Waterkloof/Brooklyn), `getNearestJobCenter(origins: LatLon[], destinations: JobCenter[]): Promise<NearestJobCenterResult[]>` where `LatLon = { lat: number; lon: number }` and `NearestJobCenterResult = { minutes: number | null; jobCenterId: string | null; jobCenterName: string | null }`. Later tasks (join, run) call `getNearestJobCenter` and `JOB_CENTERS`.

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/osrmClient.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getNearestJobCenter } from "./osrmClient";

describe("getNearestJobCenter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const destinations = [
    { id: "pretoria-cbd", name: "Pretoria CBD", lat: -25.7461, lon: 28.1881 },
    { id: "menlyn", name: "Menlyn", lat: -25.7825, lon: 28.2775 },
  ];

  it("picks, per origin, the destination with the shortest duration and converts seconds to minutes", async () => {
    const origins = [
      { lat: -25.75, lon: 28.19 },
      { lat: -25.9, lon: 28.3 },
    ];
    // durations[originIndex][destinationIndex]: origin 0 is closer to Pretoria CBD (120s),
    // origin 1 is closer to Menlyn (300s vs 900s to CBD)
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        durations: [
          [120, 800],
          [900, 300],
        ],
      }),
    });

    const result = await getNearestJobCenter(origins, destinations);

    expect(result).toEqual([
      { minutes: 2, jobCenterId: "pretoria-cbd", jobCenterName: "Pretoria CBD" },
      { minutes: 5, jobCenterId: "menlyn", jobCenterName: "Menlyn" },
    ]);
  });

  it("returns a null result for an origin with no reachable destination", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ code: "Ok", durations: [[null, null]] }),
    });

    const result = await getNearestJobCenter([{ lat: -25.75, lon: 28.19 }], destinations);

    expect(result).toEqual([{ minutes: null, jobCenterId: null, jobCenterName: null }]);
  });

  it("retries once on HTTP 429 then succeeds", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", durations: [[600, 1200]] }),
      });

    const result = await getNearestJobCenter([{ lat: -25.75, lon: 28.19 }], destinations);

    expect(result).toEqual([{ minutes: 10, jobCenterId: "pretoria-cbd", jobCenterName: "Pretoria CBD" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/osrmClient.test.ts`
Expected: FAIL — `Cannot find module './osrmClient'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// data-pipeline/src/constants/jobCenters.ts
export interface JobCenter {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const JOB_CENTERS = [
  { id: "pretoria-cbd", name: "Pretoria CBD", lat: -25.7461, lon: 28.1881 },
  { id: "menlyn", name: "Menlyn", lat: -25.7825, lon: 28.2775 },
  { id: "centurion", name: "Centurion", lat: -25.8603, lon: 28.1894 },
  { id: "rosslyn", name: "Rosslyn", lat: -25.6167, lon: 28.0833 },
  { id: "hatfield", name: "Hatfield", lat: -25.7487, lon: 28.2323 },
  { id: "waterkloof-brooklyn", name: "Waterkloof/Brooklyn", lat: -25.7677, lon: 28.2361 },
] as const satisfies readonly JobCenter[];
```

```typescript
// data-pipeline/src/osrmClient.ts
import type { JobCenter } from "./constants/jobCenters";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface NearestJobCenterResult {
  minutes: number | null;
  jobCenterId: string | null;
  jobCenterName: string | null;
}

const OSRM_BASE_URL = "https://router.project-osrm.org";
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTable(
  origins: LatLon[],
  destinations: JobCenter[],
  attempt = 1,
): Promise<number[][]> {
  const coords = [...origins, ...destinations].map((c) => `${c.lon},${c.lat}`).join(";");
  const sourceIndices = origins.map((_, i) => i).join(";");
  const destinationIndices = destinations.map((_, i) => origins.length + i).join(";");
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?sources=${sourceIndices}&destinations=${destinationIndices}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429 && attempt < 3) {
      await sleep(BATCH_DELAY_MS * attempt);
      return fetchTable(origins, destinations, attempt + 1);
    }
    throw new Error(`OSRM table request failed: ${response.status}`);
  }
  const body = (await response.json()) as { code: string; durations: number[][] };
  if (body.code !== "Ok") {
    throw new Error(`OSRM table returned code ${body.code}`);
  }
  return body.durations;
}

function pickNearest(
  row: number[],
  destinations: JobCenter[],
): NearestJobCenterResult {
  let bestIndex = -1;
  let bestSeconds = Number.POSITIVE_INFINITY;

  for (let i = 0; i < row.length; i++) {
    const seconds = row[i];
    if (seconds !== null && seconds !== undefined && seconds < bestSeconds) {
      bestSeconds = seconds;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    return { minutes: null, jobCenterId: null, jobCenterName: null };
  }

  const destination = destinations[bestIndex];
  return {
    minutes: Math.round((bestSeconds / 60) * 100) / 100,
    jobCenterId: destination.id,
    jobCenterName: destination.name,
  };
}

export async function getNearestJobCenter(
  origins: LatLon[],
  destinations: JobCenter[],
): Promise<NearestJobCenterResult[]> {
  const results: NearestJobCenterResult[] = [];

  for (let start = 0; start < origins.length; start += BATCH_SIZE) {
    const batch = origins.slice(start, start + BATCH_SIZE);
    const durations = await fetchTable(batch, destinations);
    for (const row of durations) {
      results.push(pickNearest(row, destinations));
    }

    if (start + BATCH_SIZE < origins.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}
```

```json
// data-pipeline/package.json
{
  "name": "buffer-zones-data-pipeline",
  "private": true,
  "type": "module",
  "scripts": {
    "run": "tsx src/run.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@turf/turf": "^7.1.0",
    "shapefile": "^0.6.6"
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.14",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// data-pipeline/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npm install && npx vitest run src/osrmClient.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/package.json data-pipeline/tsconfig.json data-pipeline/src/constants data-pipeline/src/osrmClient.ts data-pipeline/src/osrmClient.test.ts
git commit -m "feat(pipeline): OSRM public-table client with nearest-of-N job centers"
```

---

### Task 3: Boundaries adapter (Tshwane sub-place data)

**Files:**
- Create: `data-pipeline/src/adapters/boundaries.ts`
- Test: `data-pipeline/src/adapters/boundaries.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RawSubPlaceProperties` (interface for the unnormalized source shape), `normalizeBoundaries(raw: GeoJSON.FeatureCollection): NormalizedTownship[]` where `NormalizedTownship = { id: string; name: string; population: number | undefined; centroid: LatLon; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon }`, `fetchTshwaneBoundaries(): Promise<GeoJSON.FeatureCollection>`. Task 7 (join) consumes `NormalizedTownship[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/adapters/boundaries.test.ts
import { describe, expect, it } from "vitest";
import { normalizeBoundaries } from "./boundaries";

describe("normalizeBoundaries", () => {
  it("maps raw sub-place properties to NormalizedTownship and computes a centroid", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { SP_CODE: "799013001", SP_NAME: "Mamelodi SP", TotalPop: 334577 },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28.4, -25.68],
                [28.42, -25.68],
                [28.42, -25.66],
                [28.4, -25.66],
                [28.4, -25.68],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "799013001",
      name: "Mamelodi SP",
      population: 334577,
    });
    expect(result[0].centroid.lat).toBeCloseTo(-25.67, 1);
    expect(result[0].centroid.lon).toBeCloseTo(28.41, 1);
  });

  it("omits population when the source field is missing", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { SP_CODE: "1", SP_NAME: "Unnamed" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[[28, -25.8], [28.1, -25.8], [28.1, -25.7], [28, -25.7], [28, -25.8]]],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    expect(result[0].population).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/adapters/boundaries.test.ts`
Expected: FAIL — `Cannot find module './boundaries'`

- [ ] **Step 3: Write minimal implementation**

Before writing `fetchTshwaneBoundaries`, use WebSearch/WebFetch to find Adrian Frith's Tshwane (Pretoria) sub-place GeoJSON (search terms: `adrianfrith census 2011 sub-place geojson tshwane pretoria github`). If a usable direct GeoJSON URL is found, hardcode it in `BOUNDARY_SOURCE_URL` with a comment noting the source and access date. If no usable direct GeoJSON is found within a few searches, fall back to Stats SA's sub-place shapefile (search `statssa.gov.za sub-place boundaries shapefile download`) and convert it with the `shapefile` + `@turf/turf` npm packages already in `data-pipeline/package.json` — write a `convertShapefileToGeoJSON(buffer: ArrayBuffer)` helper in the same file using `shapefile.open`. Either path must end at a real, reachable URL — do not leave this unresolved.

```typescript
// data-pipeline/src/adapters/boundaries.ts
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

// Source: Adrian Frith's cleaned Census 2011 sub-place boundaries for the City of Tshwane.
// Verify and replace with the exact confirmed URL before running the pipeline (see task notes).
const BOUNDARY_SOURCE_URL =
  "https://raw.githubusercontent.com/adrianfrith/subplace/master/subplace_tshwane.geojson";

export interface RawSubPlaceProperties {
  SP_CODE: string;
  SP_NAME: string;
  TotalPop?: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface NormalizedTownship {
  id: string;
  name: string;
  population: number | undefined;
  centroid: LatLon;
  geometry: Polygon | MultiPolygon;
}

export function normalizeBoundaries(
  raw: FeatureCollection,
): NormalizedTownship[] {
  return raw.features.map((feature) => {
    const props = feature.properties as RawSubPlaceProperties;
    const geometry = feature.geometry as Polygon | MultiPolygon;
    const centroidFeature = turf.centroid(feature as Feature<Polygon | MultiPolygon>);
    const [lon, lat] = centroidFeature.geometry.coordinates;

    return {
      id: props.SP_CODE,
      name: props.SP_NAME,
      population: props.TotalPop,
      centroid: { lat, lon },
      geometry,
    };
  });
}

export async function fetchTshwaneBoundaries(): Promise<FeatureCollection> {
  const response = await fetch(BOUNDARY_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Tshwane boundaries: ${response.status}`);
  }
  return (await response.json()) as FeatureCollection;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/adapters/boundaries.test.ts`
Expected: PASS (2 tests) — note these test `normalizeBoundaries` (pure) only; `fetchTshwaneBoundaries` is exercised for real in Task 8's pipeline run, not unit-tested against the network.

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/adapters/boundaries.ts data-pipeline/src/adapters/boundaries.test.ts
git commit -m "feat(pipeline): Tshwane sub-place boundary adapter"
```

---

### Task 4: Gautrain transit adapter (Overpass API)

**Files:**
- Create: `data-pipeline/src/adapters/gautrain.ts`
- Test: `data-pipeline/src/adapters/gautrain.test.ts`

**Interfaces:**
- Consumes: `TransitLayerFeatureCollection`, `TransitStop` from `@buffer-zones/shared` (add `data-pipeline` dependency on the shared package via `"@buffer-zones/shared": "file:../packages/shared"` in `data-pipeline/package.json`).
- Produces: `normalizeGautrainOverpass(raw: OverpassResponse): TransitLayerFeatureCollection`, `fetchGautrainRail(): Promise<OverpassResponse>` where `OverpassResponse = { elements: OverpassElement[] }`.

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/adapters/gautrain.test.ts
import { describe, expect, it } from "vitest";
import { normalizeGautrainOverpass } from "./gautrain";

describe("normalizeGautrainOverpass", () => {
  it("normalizes Overpass 'way' rail elements and 'node' station elements into transit features", () => {
    const raw = {
      elements: [
        {
          type: "way" as const,
          id: 111,
          tags: { railway: "rail", operator: "Gautrain", name: "Hatfield - Pretoria Line" },
          geometry: [
            { lat: -25.75, lon: 28.23 },
            { lat: -25.746, lon: 28.188 },
          ],
        },
        {
          type: "node" as const,
          id: 222,
          tags: { railway: "station", operator: "Gautrain", name: "Hatfield Station" },
          lat: -25.75,
          lon: 28.23,
        },
      ],
    };

    const result = normalizeGautrainOverpass(raw);

    expect(result.features).toHaveLength(2);
    const line = result.features.find((f) => f.geometry.type === "LineString");
    const point = result.features.find((f) => f.geometry.type === "Point");
    expect(line?.properties).toEqual({
      id: "way/111",
      name: "Hatfield - Pretoria Line",
      network: "Gautrain",
    });
    expect(point?.properties.name).toBe("Hatfield Station");
    expect(point?.geometry).toEqual({ type: "Point", coordinates: [28.23, -25.75] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/adapters/gautrain.test.ts`
Expected: FAIL — `Cannot find module './gautrain'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// data-pipeline/src/adapters/gautrain.ts
import type { TransitLayerFeatureCollection, TransitStop } from "@buffer-zones/shared";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Tshwane/Gauteng bounding box (south, west, north, east), covers the Pretoria portion of the Gautrain network
const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";

const GAUTRAIN_QUERY = `
[out:json][timeout:60];
(
  way["railway"="rail"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
  node["railway"="station"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
);
out geom;
`;

interface OverpassWayElement {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry: { lat: number; lon: number }[];
}

interface OverpassNodeElement {
  type: "node";
  id: number;
  tags?: Record<string, string>;
  lat: number;
  lon: number;
}

export type OverpassElement = OverpassWayElement | OverpassNodeElement;
export interface OverpassResponse {
  elements: OverpassElement[];
}

export function normalizeGautrainOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    const stop: TransitStop = {
      id: `${element.type}/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network: "Gautrain",
    };

    if (element.type === "way") {
      features.push({
        type: "Feature",
        properties: stop,
        geometry: {
          type: "LineString",
          coordinates: element.geometry.map((p) => [p.lon, p.lat]),
        },
      });
    } else {
      features.push({
        type: "Feature",
        properties: stop,
        geometry: { type: "Point", coordinates: [element.lon, element.lat] },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export async function fetchGautrainRail(): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(GAUTRAIN_QUERY)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass query failed: ${response.status}`);
  }
  return (await response.json()) as OverpassResponse;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/adapters/gautrain.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/adapters/gautrain.ts data-pipeline/src/adapters/gautrain.test.ts data-pipeline/package.json
git commit -m "feat(pipeline): Gautrain transit adapter via Overpass API"
```

---

### Task 5: A Re Yeng transit adapter

**Files:**
- Create: `data-pipeline/src/adapters/aReYeng.ts`
- Test: `data-pipeline/src/adapters/aReYeng.test.ts`

**Interfaces:**
- Consumes: `TransitLayerFeatureCollection`, `TransitStop` from `@buffer-zones/shared`.
- Produces: `normalizeAReYeng(raw: GeoJSON.FeatureCollection): TransitLayerFeatureCollection` (for the open-data-portal path) and `normalizeAReYengOverpass(raw: OverpassResponse): TransitLayerFeatureCollection` (OSM fallback, structurally identical to Task 4's Overpass normalizer but tagged `network: "A Re Yeng"`), plus `fetchAReYengRoutes(): Promise<GeoJSON.FeatureCollection | OverpassResponse>`.

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/adapters/aReYeng.test.ts
import { describe, expect, it } from "vitest";
import { normalizeAReYeng, normalizeAReYengOverpass } from "./aReYeng";

describe("normalizeAReYeng", () => {
  it("normalizes a raw open-data-portal route feature into the common TransitLayer shape", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { ROUTE_ID: "ARY-1", ROUTE_NAME: "Pretoria CBD - Menlyn" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.19, -25.75],
              [28.28, -25.78],
            ],
          },
        },
      ],
    };

    const result = normalizeAReYeng(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toEqual({
      id: "ARY-1",
      name: "Pretoria CBD - Menlyn",
      network: "A Re Yeng",
    });
  });
});

describe("normalizeAReYengOverpass", () => {
  it("normalizes an OSM-tagged fallback way into the common TransitLayer shape", () => {
    const raw = {
      elements: [
        {
          type: "way" as const,
          id: 333,
          tags: { highway: "busway", network: "A Re Yeng", name: "Line 1A" },
          geometry: [
            { lat: -25.75, lon: 28.19 },
            { lat: -25.78, lon: 28.28 },
          ],
        },
      ],
    };

    const result = normalizeAReYengOverpass(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toEqual({
      id: "way/333",
      name: "Line 1A",
      network: "A Re Yeng",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/adapters/aReYeng.test.ts`
Expected: FAIL — `Cannot find module './aReYeng'`

- [ ] **Step 3: Write minimal implementation**

Before writing `fetchAReYengRoutes`, use WebSearch to check whether the City of Tshwane open data portal currently publishes an A Re Yeng route/stop GeoJSON export (search: `city of tshwane open data portal a re yeng routes geojson`). If found, hardcode the confirmed URL in `AREYENG_SOURCE_URL` with a source comment and use `normalizeAReYeng`. If not found, use the Overpass fallback (`highway=busway` or `route=bus`, `network=A Re Yeng`) and `normalizeAReYengOverpass` — this mirrors SPEC §7's own stated fallback plan for this operator.

```typescript
// data-pipeline/src/adapters/aReYeng.ts
import type { FeatureCollection, Geometry } from "geojson";
import type { TransitLayerFeatureCollection, TransitStop } from "@buffer-zones/shared";
import type { OverpassResponse } from "./gautrain";

// Source: City of Tshwane Open Data Portal, A Re Yeng routes export, if available.
// Verify and replace with the exact confirmed URL before running the pipeline (see task notes).
const AREYENG_SOURCE_URL =
  "https://opendata.tshwane.gov.za/datasets/a-re-yeng-routes.geojson";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";
const AREYENG_OVERPASS_QUERY = `
[out:json][timeout:60];
way["network"="A Re Yeng"](${TSHWANE_BBOX});
out geom;
`;

interface RawAReYengProperties {
  ROUTE_ID: string;
  ROUTE_NAME: string;
}

export function normalizeAReYeng(raw: FeatureCollection): TransitLayerFeatureCollection {
  return {
    type: "FeatureCollection",
    features: raw.features.map((feature) => {
      const props = feature.properties as RawAReYengProperties;
      const stop: TransitStop = {
        id: props.ROUTE_ID,
        name: props.ROUTE_NAME,
        network: "A Re Yeng",
      };
      return {
        type: "Feature",
        properties: stop,
        geometry: feature.geometry as Geometry,
      } as TransitLayerFeatureCollection["features"][number];
    }),
  };
}

export function normalizeAReYengOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    if (element.type !== "way") continue;
    const stop: TransitStop = {
      id: `way/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network: "A Re Yeng",
    };
    features.push({
      type: "Feature",
      properties: stop,
      geometry: {
        type: "LineString",
        coordinates: element.geometry.map((p) => [p.lon, p.lat]),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export async function fetchAReYengRoutes(): Promise<FeatureCollection | OverpassResponse> {
  const portalResponse = await fetch(AREYENG_SOURCE_URL);
  if (portalResponse.ok) {
    return (await portalResponse.json()) as FeatureCollection;
  }

  const overpassResponse = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(AREYENG_OVERPASS_QUERY)}`,
  });
  if (!overpassResponse.ok) {
    throw new Error(`A Re Yeng fallback Overpass query failed: ${overpassResponse.status}`);
  }
  return (await overpassResponse.json()) as OverpassResponse;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/adapters/aReYeng.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/adapters/aReYeng.ts data-pipeline/src/adapters/aReYeng.test.ts
git commit -m "feat(pipeline): A Re Yeng transit adapter (open data portal + OSM fallback)"
```

---

### Task 6: Stub transit adapters and unemployment adapter

**Files:**
- Create: `data-pipeline/src/adapters/stubTransitLayer.ts`
- Create: `data-pipeline/src/adapters/unemployment.ts`
- Test: `data-pipeline/src/adapters/stubTransitLayer.test.ts`
- Test: `data-pipeline/src/adapters/unemployment.test.ts`

**Interfaces:**
- Consumes: `TransitLayerFeatureCollection` from `@buffer-zones/shared`.
- Produces: `createStubTransitLayer(): TransitLayerFeatureCollection` (always an empty feature collection), `fetchUnemploymentData(): Promise<Map<string, number> | null>` (returns `null` if no usable source is found — join logic in Task 7 must handle `null`).

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/adapters/stubTransitLayer.test.ts
import { describe, expect, it } from "vitest";
import { createStubTransitLayer } from "./stubTransitLayer";

describe("createStubTransitLayer", () => {
  it("returns a valid, empty TransitLayerFeatureCollection", () => {
    const result = createStubTransitLayer();
    expect(result).toEqual({ type: "FeatureCollection", features: [] });
  });
});
```

```typescript
// data-pipeline/src/adapters/unemployment.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchUnemploymentData } from "./unemployment";

describe("fetchUnemploymentData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no source responds successfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await fetchUnemploymentData();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/adapters/stubTransitLayer.test.ts src/adapters/unemployment.test.ts`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// data-pipeline/src/adapters/stubTransitLayer.ts
import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";

// Used for MyCiTi, PRASA, Rea Vaya, Metrobus, and Durban Transport in v1:
// registry entries exist and are typed, but real data hasn't been sourced yet
// (Tshwane/Pretoria-only scope, design doc §2/§8). Populate a real adapter per
// operator later following the pattern in gautrain.ts/aReYeng.ts.
export function createStubTransitLayer(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
```

```typescript
// data-pipeline/src/adapters/unemployment.ts
// Attempts a real Stats SA ward-level Tshwane unemployment download. If no
// usable public source is found, returns null so the pipeline exports an
// explicit "not yet available" empty layer rather than fabricated numbers
// (design doc §4, §8).
const UNEMPLOYMENT_SOURCE_URL =
  "https://www.statssa.gov.za/publications/P0211/Tshwane_ward_unemployment.json";

export async function fetchUnemploymentData(): Promise<Map<string, number> | null> {
  try {
    const response = await fetch(UNEMPLOYMENT_SOURCE_URL);
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as Record<string, number>;
    return new Map(Object.entries(body));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/adapters/stubTransitLayer.test.ts src/adapters/unemployment.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/adapters/stubTransitLayer.ts data-pipeline/src/adapters/stubTransitLayer.test.ts data-pipeline/src/adapters/unemployment.ts data-pipeline/src/adapters/unemployment.test.ts
git commit -m "feat(pipeline): stub transit adapters and best-effort unemployment adapter"
```

---

### Task 7: Join logic

**Files:**
- Create: `data-pipeline/src/join.ts`
- Test: `data-pipeline/src/join.test.ts`

**Interfaces:**
- Consumes: `NormalizedTownship` from `./adapters/boundaries`, `NearestJobCenterResult` from `./osrmClient`, `TownshipProperties`/`TownshipFeature` from `@buffer-zones/shared`.
- Produces: `joinTownshipData(townships: NormalizedTownship[], nearestJobCenters: NearestJobCenterResult[], unemployment: Map<string, number> | null): TownshipFeature[]`. Task 8 (export) consumes this return type directly.

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/join.test.ts
import { describe, expect, it } from "vitest";
import { joinTownshipData } from "./join";
import type { NormalizedTownship } from "./adapters/boundaries";
import type { NearestJobCenterResult } from "./osrmClient";

const township = (id: string, name: string): NormalizedTownship => ({
  id,
  name,
  population: 1000,
  centroid: { lat: -25.75, lon: 28.2 },
  geometry: {
    type: "Polygon",
    coordinates: [[[28, -25.8], [28.1, -25.8], [28.1, -25.7], [28, -25.7], [28, -25.8]]],
  },
});

describe("joinTownshipData", () => {
  it("joins nearest job center, commute minutes, and unemployment rate onto each feature by index/id", () => {
    const townships = [township("A", "Alpha"), township("B", "Beta")];
    const nearest: NearestJobCenterResult[] = [
      { minutes: 23.5, jobCenterId: "menlyn", jobCenterName: "Menlyn" },
      { minutes: null, jobCenterId: null, jobCenterName: null },
    ];
    const unemployment = new Map([["A", 41.2]]);

    const result = joinTownshipData(townships, nearest, unemployment);

    expect(result).toHaveLength(2);
    expect(result[0].properties).toMatchObject({
      id: "A",
      name: "Alpha",
      commuteMinutes: 23.5,
      nearestJobCenter: "Menlyn",
      unemploymentRatePercent: 41.2,
    });
    expect(result[1].properties).toMatchObject({
      id: "B",
      commuteMinutes: null,
      nearestJobCenter: "",
      unemploymentRatePercent: null,
    });
    expect(result[0].geometry).toEqual(townships[0].geometry);
  });

  it("sets unemploymentRatePercent to null for every feature when unemployment data is unavailable", () => {
    const result = joinTownshipData(
      [township("A", "Alpha")],
      [{ minutes: 10, jobCenterId: "pretoria-cbd", jobCenterName: "Pretoria CBD" }],
      null,
    );
    expect(result[0].properties.unemploymentRatePercent).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/join.test.ts`
Expected: FAIL — `Cannot find module './join'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// data-pipeline/src/join.ts
import type { TownshipFeature } from "@buffer-zones/shared";
import type { NormalizedTownship } from "./adapters/boundaries";
import type { NearestJobCenterResult } from "./osrmClient";

export function joinTownshipData(
  townships: NormalizedTownship[],
  nearestJobCenters: NearestJobCenterResult[],
  unemployment: Map<string, number> | null,
): TownshipFeature[] {
  return townships.map((township, index) => {
    const nearest = nearestJobCenters[index] ?? {
      minutes: null,
      jobCenterId: null,
      jobCenterName: null,
    };
    return {
      type: "Feature",
      geometry: township.geometry,
      properties: {
        id: township.id,
        name: township.name,
        population: township.population,
        commuteMinutes: nearest.minutes,
        nearestJobCenter: nearest.jobCenterName ?? "",
        distanceKm: null,
        unemploymentRatePercent: unemployment?.get(township.id) ?? null,
        nearestGautrainStationKm: null,
        nearestAReYengStopKm: null,
      },
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/join.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/join.ts data-pipeline/src/join.test.ts
git commit -m "feat(pipeline): join nearest-job-center commute time and unemployment onto township features"
```

---

### Task 8: Export + orchestration script, then run the real pipeline

**Files:**
- Create: `data-pipeline/src/export.ts`
- Create: `data-pipeline/src/run.ts`
- Create: `data-pipeline/README.md`
- Test: `data-pipeline/src/export.test.ts`
- Generates (not committed as code, but committed as data): `packages/web/public/data/townships.v1.geojson`, `packages/web/public/data/gautrain.v1.geojson`, `packages/web/public/data/a-re-yeng.v1.geojson`

**Interfaces:**
- Consumes: everything from Tasks 2–7 (`JOB_CENTERS`, `getNearestJobCenter`, `fetchTshwaneBoundaries`, `normalizeBoundaries`, `fetchGautrainRail`, `normalizeGautrainOverpass`, `fetchAReYengRoutes`, `normalizeAReYeng`, `normalizeAReYengOverpass`, `createStubTransitLayer`, `fetchUnemploymentData`, `joinTownshipData`).
- Produces: `writeGeoJsonFile(path: string, data: unknown): Promise<void>`, and the three real output files consumed by the web app's `TownshipDataRepository` (Task 11) and `layers/registry.ts` (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
// data-pipeline/src/export.test.ts
import { describe, expect, it, vi } from "vitest";
import { writeGeoJsonFile } from "./export";
import { writeFile, mkdir } from "node:fs/promises";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe("writeGeoJsonFile", () => {
  it("creates the parent directory and writes pretty-printed JSON", async () => {
    await writeGeoJsonFile("/out/foo.geojson", { type: "FeatureCollection", features: [] });

    expect(mkdir).toHaveBeenCalledWith("/out", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/out/foo.geojson",
      JSON.stringify({ type: "FeatureCollection", features: [] }, null, 2),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data-pipeline && npx vitest run src/export.test.ts`
Expected: FAIL — `Cannot find module './export'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// data-pipeline/src/export.ts
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeGeoJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2));
}
```

```typescript
// data-pipeline/src/run.ts
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { JOB_CENTERS } from "./constants/jobCenters";
import { getNearestJobCenter } from "./osrmClient";
import { fetchTshwaneBoundaries, normalizeBoundaries } from "./adapters/boundaries";
import { fetchGautrainRail, normalizeGautrainOverpass } from "./adapters/gautrain";
import { fetchAReYengRoutes, normalizeAReYeng, normalizeAReYengOverpass } from "./adapters/aReYeng";
import { fetchUnemploymentData } from "./adapters/unemployment";
import { joinTownshipData } from "./join";
import { writeGeoJsonFile } from "./export";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../packages/web/public/data");

async function main() {
  console.log("Fetching Tshwane sub-place boundaries...");
  const rawBoundaries = await fetchTshwaneBoundaries();
  const townships = normalizeBoundaries(rawBoundaries);
  console.log(`  ${townships.length} sub-places loaded`);

  console.log("Computing drive times to nearest of 6 job centers (CBD, Menlyn, Centurion, Rosslyn, Hatfield, Waterkloof/Brooklyn) via public OSRM...");
  const nearestJobCenters = await getNearestJobCenter(
    townships.map((t) => t.centroid),
    JOB_CENTERS,
  );

  console.log("Fetching unemployment data (best-effort)...");
  const unemployment = await fetchUnemploymentData();
  if (!unemployment) {
    console.log("  No usable unemployment source found — layer will ship empty.");
  }

  const townshipFeatures = joinTownshipData(townships, nearestJobCenters, unemployment);
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "townships.v1.geojson"), {
    type: "FeatureCollection",
    features: townshipFeatures,
  });

  console.log("Fetching Gautrain rail via Overpass...");
  const gautrain = normalizeGautrainOverpass(await fetchGautrainRail());
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "gautrain.v1.geojson"), gautrain);

  console.log("Fetching A Re Yeng routes...");
  const rawAReYeng = await fetchAReYengRoutes();
  const aReYeng = "elements" in rawAReYeng
    ? normalizeAReYengOverpass(rawAReYeng)
    : normalizeAReYeng(rawAReYeng);
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "a-re-yeng.v1.geojson"), aReYeng);

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

```markdown
<!-- data-pipeline/README.md -->
# Data Pipeline

Offline scripts that produce the static GeoJSON files served by the web app. Not an npm workspace — run manually.

## Run

```bash
cd data-pipeline
npm install
npm run run
```

Outputs `townships.v1.geojson`, `gautrain.v1.geojson`, `a-re-yeng.v1.geojson` into `packages/web/public/data/`.

## Adding a new metro or transit operator

Follow `src/adapters/gautrain.ts` or `src/adapters/aReYeng.ts` as a template: one adapter file with a `fetchX()` + `normalizeX()` pair, normalizing into the shared `TransitLayerFeatureCollection` shape. Replace the corresponding stub in `src/adapters/stubTransitLayer.ts` usage inside `run.ts`, add a registry entry in `packages/web/src/layers/registry.ts`, and re-run the pipeline. No other pipeline or map code needs to change (see SPEC.md §11).

Currently stubbed (empty data, typed adapters not yet written): MyCiTi, PRASA, Rea Vaya, Metrobus, Durban Transport — see design doc §8.

## Rate limits

Drive-time computation uses the public `router.project-osrm.org` demo server, batched at 50 origins per request (against both job centers in the same table request) with a 1s delay between batches and retry-with-backoff on HTTP 429. For heavier use, self-host OSRM (see SPEC.md §3) and swap the base URL in `src/osrmClient.ts`.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data-pipeline && npx vitest run src/export.test.ts`
Expected: PASS

Then run the real pipeline end-to-end:

Run: `cd data-pipeline && npm run run`
Expected: Console logs for each stage, ending in "Done." with three files written under `packages/web/public/data/`. If a fetch step fails (e.g. a source URL from Task 3/4/5 returns 404), stop and re-verify that specific adapter's source URL via WebSearch/WebFetch before re-running — don't silently substitute fake data.

Verify the output:

Run: `node -e "const d = require('./packages/web/public/data/townships.v1.geojson'); console.log(d.features.length, d.features[0].properties)"`
Expected: A positive feature count and a properties object with real (non-null, non-placeholder) `commuteMinutes` and `nearestJobCenter` (one of "Pretoria CBD", "Menlyn", "Centurion", "Rosslyn", "Hatfield", "Waterkloof/Brooklyn") for most features.

- [ ] **Step 5: Commit**

```bash
git add data-pipeline/src/export.ts data-pipeline/src/export.test.ts data-pipeline/src/run.ts data-pipeline/README.md packages/web/public/data/townships.v1.geojson packages/web/public/data/gautrain.v1.geojson packages/web/public/data/a-re-yeng.v1.geojson
git commit -m "feat(pipeline): export/orchestration script; run pipeline and commit real v1 data"
```

---

### Task 9: Web app scaffold (Vite + React + TS + tooling)

**Files:**
- Create: `packages/web/package.json`, `packages/web/vite.config.ts`, `packages/web/tsconfig.json`, `packages/web/vitest.setup.ts`, `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Test: `packages/web/src/smoke.test.ts` (verifies the test environment itself is wired correctly before building real components)

**Interfaces:**
- Consumes: `@buffer-zones/shared` types.
- Produces: a working `npm run dev`/`npm run build`/`npm run test` for `packages/web`, and the happy-dom + RTL test environment every later web task's tests rely on.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/smoke.test.ts
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("test environment", () => {
  it("renders a DOM node via happy-dom", () => {
    render(<div data-testid="probe">ok</div>);
    expect(screen.getByTestId("probe")).toHaveTextContent("ok");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/smoke.test.ts`
Expected: FAIL — no vitest config / testing-library / happy-dom installed yet, or JSX parse error

- [ ] **Step 3: Write minimal implementation**

```json
// packages/web/package.json
{
  "name": "@buffer-zones/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@buffer-zones/shared": "file:../shared",
    "clsx": "^2.1.1",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.451.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "@fontsource/inter": "^5.1.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/leaflet": "^1.9.14",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "fontaine": "^0.5.0",
    "happy-dom": "^15.7.4",
    "typescript": "^5.6.0",
    "vite": "^5.4.8",
    "vitest": "^2.1.0"
  }
}
```

```typescript
// packages/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";

export default defineConfig({
  plugins: [
    react(),
    FontaineTransform.vite({
      fallbacks: ["Arial", "sans-serif"],
      resolvePath: (id) => new URL(`./node_modules/${id}`, import.meta.url),
    }),
  ],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
```

```typescript
// packages/web/vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

```json
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

```html
<!-- packages/web/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Buffer Zones</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```typescript
// packages/web/src/main.tsx
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "leaflet/dist/leaflet.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// App is added in Task 15 — a minimal placeholder keeps main.tsx buildable
// as soon as the scaffold exists.
function App() {
  return <div>Buffer Zones</div>;
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npm install && npx vitest run src/smoke.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/package.json packages/web/vite.config.ts packages/web/tsconfig.json packages/web/vitest.setup.ts packages/web/index.html packages/web/src/main.tsx packages/web/src/smoke.test.ts
git commit -m "chore(web): scaffold Vite + React + TS app with Vitest/RTL/happy-dom"
```

---

### Task 10: Color scale and commute-time formatting utils

**Files:**
- Create: `packages/web/src/constants/colorScale.ts`
- Create: `packages/web/src/utils/colorScale.ts`
- Create: `packages/web/src/utils/formatCommuteTime.ts`
- Test: `packages/web/src/utils/colorScale.test.ts`
- Test: `packages/web/src/utils/formatCommuteTime.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `enum CommuteBucket { Short, Moderate, Long, VeryLong }`, `getCommuteBucket(minutes: number): CommuteBucket`, `commuteMinutesToColor(minutes: number | null): string`, `formatCommuteTime(minutes: number | null): string`. Task 12 (`createLayerConfig`) and Task 13 (Legend, Popup) consume these.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/utils/colorScale.test.ts
import { describe, expect, it } from "vitest";
import { CommuteBucket, commuteMinutesToColor, getCommuteBucket } from "./colorScale";

describe("getCommuteBucket", () => {
  it.each([
    [10, CommuteBucket.Short],
    [30, CommuteBucket.Moderate],
    [50, CommuteBucket.Long],
    [90, CommuteBucket.VeryLong],
  ])("classifies %i minutes as %s", (minutes, expected) => {
    expect(getCommuteBucket(minutes)).toBe(expected);
  });
});

describe("commuteMinutesToColor", () => {
  it("returns a distinct color per bucket", () => {
    const colors = new Set([
      commuteMinutesToColor(10),
      commuteMinutesToColor(30),
      commuteMinutesToColor(50),
      commuteMinutesToColor(90),
    ]);
    expect(colors.size).toBe(4);
  });

  it("returns a neutral gray for null (no data)", () => {
    expect(commuteMinutesToColor(null)).toBe("#cccccc");
  });
});
```

```typescript
// packages/web/src/utils/formatCommuteTime.test.ts
import { describe, expect, it } from "vitest";
import { formatCommuteTime } from "./formatCommuteTime";

describe("formatCommuteTime", () => {
  it("formats whole minutes", () => {
    expect(formatCommuteTime(23)).toBe("23 min");
  });

  it("rounds fractional minutes", () => {
    expect(formatCommuteTime(23.7)).toBe("24 min");
  });

  it("formats over an hour as hours and minutes", () => {
    expect(formatCommuteTime(95)).toBe("1h 35min");
  });

  it("shows 'No data' for null", () => {
    expect(formatCommuteTime(null)).toBe("No data");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/utils/colorScale.test.ts src/utils/formatCommuteTime.test.ts`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/constants/colorScale.ts
export const COMMUTE_BUCKET_BREAKPOINTS = { short: 20, moderate: 40, long: 60 } as const;

export const COMMUTE_BUCKET_COLORS = {
  short: "#2ecc71",
  moderate: "#f1c40f",
  long: "#e67e22",
  veryLong: "#c0392b",
  noData: "#cccccc",
} as const;
```

```typescript
// packages/web/src/utils/colorScale.ts
import { COMMUTE_BUCKET_BREAKPOINTS, COMMUTE_BUCKET_COLORS } from "../constants/colorScale";

export enum CommuteBucket {
  Short = "Short",
  Moderate = "Moderate",
  Long = "Long",
  VeryLong = "VeryLong",
}

export function getCommuteBucket(minutes: number): CommuteBucket {
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.short) return CommuteBucket.Short;
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.moderate) return CommuteBucket.Moderate;
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.long) return CommuteBucket.Long;
  return CommuteBucket.VeryLong;
}

const BUCKET_COLOR_MAP: Record<CommuteBucket, string> = {
  [CommuteBucket.Short]: COMMUTE_BUCKET_COLORS.short,
  [CommuteBucket.Moderate]: COMMUTE_BUCKET_COLORS.moderate,
  [CommuteBucket.Long]: COMMUTE_BUCKET_COLORS.long,
  [CommuteBucket.VeryLong]: COMMUTE_BUCKET_COLORS.veryLong,
};

export function commuteMinutesToColor(minutes: number | null): string {
  if (minutes === null) return COMMUTE_BUCKET_COLORS.noData;
  return BUCKET_COLOR_MAP[getCommuteBucket(minutes)];
}
```

```typescript
// packages/web/src/utils/formatCommuteTime.ts
export function formatCommuteTime(minutes: number | null): string {
  if (minutes === null) return "No data";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${hours}h ${remainder}min`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/utils/colorScale.test.ts src/utils/formatCommuteTime.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/constants/colorScale.ts packages/web/src/utils/colorScale.ts packages/web/src/utils/formatCommuteTime.ts packages/web/src/utils/colorScale.test.ts packages/web/src/utils/formatCommuteTime.test.ts
git commit -m "feat(web): commute-time color scale and formatting utils"
```

---

### Task 11: TownshipDataRepository

**Files:**
- Create: `packages/web/src/data/TownshipDataRepository.ts`
- Test: `packages/web/src/data/TownshipDataRepository.test.ts`

**Interfaces:**
- Consumes: `TownshipFeature` from `@buffer-zones/shared`.
- Produces: `interface TownshipDataRepository { getTownships(): Promise<TownshipFeature[]> }`, `FetchTownshipDataRepository` (implementation fetching a given URL), `createTownshipDataRepository(dataUrl: string): TownshipDataRepository`. Task 12's `createLayerConfig` and Task 15's `App` consume `TownshipDataRepository`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/data/TownshipDataRepository.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { createTownshipDataRepository } from "./TownshipDataRepository";

describe("createTownshipDataRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the given URL and returns the parsed features array", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { id: "A" }, geometry: null }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => geojson }));

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");
    const result = await repo.getTownships();

    expect(fetch).toHaveBeenCalledWith("/data/townships.v1.geojson");
    expect(result).toEqual(geojson.features);
  });

  it("throws a descriptive error when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const repo = createTownshipDataRepository("/data/missing.geojson");

    await expect(repo.getTownships()).rejects.toThrow("Failed to load /data/missing.geojson: 404");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/data/TownshipDataRepository.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/data/TownshipDataRepository.ts
import type { TownshipFeature } from "@buffer-zones/shared";

export interface TownshipDataRepository {
  getTownships(): Promise<TownshipFeature[]>;
}

class FetchTownshipDataRepository implements TownshipDataRepository {
  constructor(private readonly dataUrl: string) {}

  async getTownships(): Promise<TownshipFeature[]> {
    const response = await fetch(this.dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${this.dataUrl}: ${response.status}`);
    }
    const geojson = (await response.json()) as { features: TownshipFeature[] };
    return geojson.features;
  }
}

export function createTownshipDataRepository(dataUrl: string): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/data/TownshipDataRepository.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/data/TownshipDataRepository.ts packages/web/src/data/TownshipDataRepository.test.ts
git commit -m "feat(web): TownshipDataRepository abstracting static GeoJSON fetch"
```

---

### Task 12: Layer registry and createLayerConfig factory

**Files:**
- Create: `packages/web/src/layers/registry.ts`
- Create: `packages/web/src/layers/createLayerConfig.ts`
- Test: `packages/web/src/layers/registry.test.ts`
- Test: `packages/web/src/layers/createLayerConfig.test.ts`

**Interfaces:**
- Consumes: `LayerDefinition`, `LayerId`, `LayerStyle` from `@buffer-zones/shared`; `commuteMinutesToColor` from Task 10.
- Produces: `LAYER_REGISTRY: LayerDefinition[]`, `getLayerDefinition(id: LayerId): LayerDefinition | undefined`, `createLayerConfig(definition: LayerDefinition): LeafletLayerConfig` where `LeafletLayerConfig = { pathOptions?: L.PathOptions; styleFn?: (feature: GeoJSON.Feature) => L.PathOptions }`. Task 13 (Map component) and Task 14 (toggle UI) consume `LAYER_REGISTRY` and `createLayerConfig`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/layers/registry.test.ts
import { describe, expect, it } from "vitest";
import { LAYER_REGISTRY, getLayerDefinition } from "./registry";

describe("LAYER_REGISTRY", () => {
  it("includes an entry for every layer defined in the shared LayerId union", () => {
    const ids = LAYER_REGISTRY.map((l) => l.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "townships",
        "gautrain",
        "a-re-yeng",
        "unemployment",
        "myciti",
        "prasa",
        "rea-vaya",
        "metrobus",
        "durban-transport",
      ]),
    );
  });

  it("getLayerDefinition finds a registered layer by id", () => {
    expect(getLayerDefinition("gautrain")?.label).toBe("Gautrain");
  });

  it("getLayerDefinition returns undefined for an unregistered id", () => {
    // @ts-expect-error deliberately invalid id for the runtime-safety test
    expect(getLayerDefinition("not-a-real-layer")).toBeUndefined();
  });
});
```

```typescript
// packages/web/src/layers/createLayerConfig.test.ts
import { describe, expect, it } from "vitest";
import { createLayerConfig } from "./createLayerConfig";
import type { LayerDefinition } from "@buffer-zones/shared";

describe("createLayerConfig", () => {
  it("produces a styleFn for a choropleth layer that colors by commuteMinutes", () => {
    const definition: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
      style: { kind: "choropleth", propertyKey: "commuteMinutes" },
    };

    const config = createLayerConfig(definition);
    const feature = { type: "Feature", properties: { commuteMinutes: 15 }, geometry: null } as GeoJSON.Feature;

    expect(config.styleFn).toBeDefined();
    expect(config.styleFn?.(feature)).toMatchObject({ fillColor: "#2ecc71" });
  });

  it("produces static pathOptions for a line layer", () => {
    const definition: LayerDefinition = {
      id: "gautrain",
      label: "Gautrain",
      dataSource: "/data/gautrain.v1.geojson",
      layerType: "line",
      defaultVisible: false,
      style: { kind: "line", color: "#16a085", weight: 3 },
    };

    const config = createLayerConfig(definition);

    expect(config.pathOptions).toEqual({ color: "#16a085", weight: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/layers/registry.test.ts src/layers/createLayerConfig.test.ts`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/layers/registry.ts
import type { LayerDefinition, LayerId } from "@buffer-zones/shared";

export const LAYER_REGISTRY: LayerDefinition[] = [
  {
    id: "townships",
    label: "Commute Time",
    dataSource: "/data/townships.v1.geojson",
    layerType: "choropleth",
    defaultVisible: true,
    style: { kind: "choropleth", propertyKey: "commuteMinutes" },
  },
  {
    id: "unemployment",
    label: "Unemployment Rate",
    dataSource: "/data/townships.v1.geojson",
    layerType: "choropleth",
    defaultVisible: false,
    style: { kind: "choropleth", propertyKey: "unemploymentRatePercent" },
  },
  {
    id: "gautrain",
    label: "Gautrain",
    dataSource: "/data/gautrain.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#16a085", weight: 3 },
  },
  {
    id: "a-re-yeng",
    label: "A Re Yeng",
    dataSource: "/data/a-re-yeng.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#27ae60", weight: 2 },
  },
  {
    id: "myciti",
    label: "MyCiTi",
    dataSource: "/data/myciti.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#1f77b4", weight: 2 },
  },
  {
    id: "prasa",
    label: "PRASA Rail",
    dataSource: "/data/prasa.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#8e44ad", weight: 2 },
  },
  {
    id: "rea-vaya",
    label: "Rea Vaya",
    dataSource: "/data/rea-vaya.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#d35400", weight: 2 },
  },
  {
    id: "metrobus",
    label: "Metrobus",
    dataSource: "/data/metrobus.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#2980b9", weight: 2 },
  },
  {
    id: "durban-transport",
    label: "Durban Transport",
    dataSource: "/data/durban-transport.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    style: { kind: "line", color: "#c0392b", weight: 2 },
  },
];

export function getLayerDefinition(id: LayerId): LayerDefinition | undefined {
  return LAYER_REGISTRY.find((layer) => layer.id === id);
}
```

```typescript
// packages/web/src/layers/createLayerConfig.ts
import type { LayerDefinition } from "@buffer-zones/shared";
import type { PathOptions } from "leaflet";
import { commuteMinutesToColor } from "../utils/colorScale";

export interface LeafletLayerConfig {
  pathOptions?: PathOptions;
  styleFn?: (feature: GeoJSON.Feature) => PathOptions;
}

export function createLayerConfig(definition: LayerDefinition): LeafletLayerConfig {
  const style = definition.style;
  if (!style) return {};

  if (style.kind === "choropleth") {
    return {
      styleFn: (feature) => {
        const value = (feature.properties?.[style.propertyKey] as number | null) ?? null;
        return { fillColor: commuteMinutesToColor(value), fillOpacity: 0.7, weight: 1, color: "#666" };
      },
    };
  }

  if (style.kind === "line") {
    return { pathOptions: { color: style.color, weight: style.weight } };
  }

  return { pathOptions: { color: style.color, radius: style.radius } as PathOptions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/layers/registry.test.ts src/layers/createLayerConfig.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/layers
git commit -m "feat(web): layer registry and createLayerConfig factory"
```

---

### Task 13: Map, Legend, and TownshipPopup components

**Files:**
- Create: `packages/web/src/components/Map/Map.tsx`, `packages/web/src/components/Map/Map.module.css`
- Create: `packages/web/src/components/Legend/Legend.tsx`, `packages/web/src/components/Legend/Legend.module.css`
- Create: `packages/web/src/components/TownshipPopup/TownshipPopup.tsx`
- Test: `packages/web/src/components/Map/Map.test.tsx`
- Test: `packages/web/src/components/Legend/Legend.test.tsx`
- Test: `packages/web/src/components/TownshipPopup/TownshipPopup.test.tsx`

**Interfaces:**
- Consumes: `LAYER_REGISTRY`, `createLayerConfig` (Task 12), `TownshipFeature`/`TownshipProperties` (shared), `formatCommuteTime` (Task 10).
- Produces: `<Map townships={TownshipFeature[]} visibleLayerIds={LayerId[]} />`, `<Legend />`, `<TownshipPopup properties={TownshipProperties} />`. Task 15's `App` composes all three.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/components/Map/Map.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data }: { data: { features: unknown[] } }) => (
    <div data-testid="geojson-layer">{data.features.length} features</div>
  ),
}));

import { Map } from "./Map";

describe("Map", () => {
  it("renders a tile layer and one GeoJSON layer per visible registry entry", () => {
    const townships = [
      { type: "Feature", properties: { id: "A", commuteMinutes: 10 }, geometry: null },
    ];

    render(<Map townships={townships as never} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
    expect(screen.getAllByTestId("geojson-layer")).toHaveLength(1);
  });

  it("renders no GeoJSON layers when visibleLayerIds is empty", () => {
    render(<Map townships={[]} visibleLayerIds={[]} />);
    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
  });
});
```

```typescript
// packages/web/src/components/Legend/Legend.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("renders one entry per commute bucket with its color and label", () => {
    render(<Legend />);
    expect(screen.getByText(/short/i)).toBeInTheDocument();
    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/long/i)).toBeInTheDocument();
    expect(screen.getByText(/very long/i)).toBeInTheDocument();
  });
});
```

```typescript
// packages/web/src/components/TownshipPopup/TownshipPopup.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TownshipPopup } from "./TownshipPopup";
import type { TownshipProperties } from "@buffer-zones/shared";

const properties: TownshipProperties = {
  id: "A",
  name: "Mamelodi SP",
  population: 334577,
  commuteMinutes: 62,
  nearestJobCenter: "Pretoria CBD",
  distanceKm: 28.4,
  unemploymentRatePercent: null,
  nearestGautrainStationKm: null,
  nearestAReYengStopKm: null,
};

describe("TownshipPopup", () => {
  it("shows name, population, formatted commute time, and nearest job center", () => {
    render(<TownshipPopup properties={properties} />);
    expect(screen.getByText("Mamelodi SP")).toBeInTheDocument();
    expect(screen.getByText(/334,577/)).toBeInTheDocument();
    expect(screen.getByText("1h 2min")).toBeInTheDocument();
    expect(screen.getByText("Pretoria CBD")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/components/Map/Map.test.tsx src/components/Legend/Legend.test.tsx src/components/TownshipPopup/TownshipPopup.test.tsx`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/components/Map/Map.tsx
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LayerId, TownshipFeature } from "@buffer-zones/shared";
import { LAYER_REGISTRY, getLayerDefinition } from "../../layers/registry";
import { createLayerConfig } from "../../layers/createLayerConfig";
import styles from "./Map.module.css";

interface MapProps {
  townships: TownshipFeature[];
  visibleLayerIds: LayerId[];
}

const PRETORIA_CENTER: [number, number] = [-25.76, 28.22];

export function Map({ townships, visibleLayerIds }: MapProps) {
  return (
    <div className={styles.mapWrapper}>
      <MapContainer center={PRETORIA_CENTER} zoom={11} className={styles.map}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {LAYER_REGISTRY.filter((layer) => visibleLayerIds.includes(layer.id)).map((layer) => {
          const definition = getLayerDefinition(layer.id);
          if (!definition) return null;
          const config = createLayerConfig(definition);
          const data = definition.id === "townships" || definition.id === "unemployment"
            ? { type: "FeatureCollection" as const, features: townships }
            : { type: "FeatureCollection" as const, features: [] };

          return (
            <GeoJSON
              key={layer.id}
              data={data}
              style={config.styleFn as never}
              pathOptions={config.pathOptions}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
```

```css
/* packages/web/src/components/Map/Map.module.css */
.mapWrapper {
  height: 100%;
  width: 100%;
}
.map {
  height: 100%;
  width: 100%;
}
```

```typescript
// packages/web/src/components/Legend/Legend.tsx
import { COMMUTE_BUCKET_COLORS } from "../../constants/colorScale";
import styles from "./Legend.module.css";

const ENTRIES = [
  { label: "Short (≤ 20 min)", color: COMMUTE_BUCKET_COLORS.short },
  { label: "Moderate (21–40 min)", color: COMMUTE_BUCKET_COLORS.moderate },
  { label: "Long (41–60 min)", color: COMMUTE_BUCKET_COLORS.long },
  { label: "Very long (> 60 min)", color: COMMUTE_BUCKET_COLORS.veryLong },
];

export function Legend() {
  return (
    <ul className={styles.legend}>
      {ENTRIES.map((entry) => (
        <li key={entry.label} className={styles.entry}>
          <span className={styles.swatch} style={{ backgroundColor: entry.color }} />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
```

```css
/* packages/web/src/components/Legend/Legend.module.css */
.legend {
  list-style: none;
  padding: 0;
  margin: 0;
}
.entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.swatch {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 2px;
}
```

```typescript
// packages/web/src/components/TownshipPopup/TownshipPopup.tsx
import type { TownshipProperties } from "@buffer-zones/shared";
import { formatCommuteTime } from "../../utils/formatCommuteTime";

interface TownshipPopupProps {
  properties: TownshipProperties;
}

export function TownshipPopup({ properties }: TownshipPopupProps) {
  return (
    <div>
      <h3>{properties.name}</h3>
      {properties.population !== undefined && (
        <p>Population: {properties.population.toLocaleString()}</p>
      )}
      <p>Commute time: {formatCommuteTime(properties.commuteMinutes)}</p>
      <p>Nearest job center: {properties.nearestJobCenter}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/components/Map/Map.test.tsx src/components/Legend/Legend.test.tsx src/components/TownshipPopup/TownshipPopup.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/Map packages/web/src/components/Legend packages/web/src/components/TownshipPopup
git commit -m "feat(web): Map, Legend, and TownshipPopup components"
```

---

### Task 14: LayerToggles (responsive) and BasemapToggle

**Files:**
- Create: `packages/web/src/components/LayerToggles/LayerToggles.tsx`, `packages/web/src/components/LayerToggles/LayerToggles.module.css`
- Create: `packages/web/src/components/BasemapToggle/BasemapToggle.tsx`
- Test: `packages/web/src/components/LayerToggles/LayerToggles.test.tsx`
- Test: `packages/web/src/components/BasemapToggle/BasemapToggle.test.tsx`

**Interfaces:**
- Consumes: `LAYER_REGISTRY` (Task 12).
- Produces: `<LayerToggles visibleLayerIds={LayerId[]} onToggle={(id: LayerId) => void} />`, `<BasemapToggle basemap={'street' | 'satellite'} onChange={(basemap: 'street' | 'satellite') => void} />`. Task 15's `App` wires both to its own state.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/components/LayerToggles/LayerToggles.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayerToggles } from "./LayerToggles";

describe("LayerToggles", () => {
  it("renders one toggle per registry entry, reflecting current visibility", () => {
    render(<LayerToggles visibleLayerIds={["townships"]} onToggle={vi.fn()} />);

    const townshipsToggle = screen.getByRole("checkbox", { name: "Commute Time" });
    const gautrainToggle = screen.getByRole("checkbox", { name: "Gautrain" });

    expect(townshipsToggle).toBeChecked();
    expect(gautrainToggle).not.toBeChecked();
  });

  it("calls onToggle with the layer id when a toggle is clicked", () => {
    const onToggle = vi.fn();
    render(<LayerToggles visibleLayerIds={[]} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "A Re Yeng" }));

    expect(onToggle).toHaveBeenCalledWith("a-re-yeng");
  });
});
```

```typescript
// packages/web/src/components/BasemapToggle/BasemapToggle.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BasemapToggle } from "./BasemapToggle";

describe("BasemapToggle", () => {
  it("calls onChange with the other basemap when clicked", () => {
    const onChange = vi.fn();
    render(<BasemapToggle basemap="street" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /satellite/i }));

    expect(onChange).toHaveBeenCalledWith("satellite");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/components/LayerToggles/LayerToggles.test.tsx src/components/BasemapToggle/BasemapToggle.test.tsx`
Expected: FAIL — modules don't exist

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/components/LayerToggles/LayerToggles.tsx
import type { LayerId } from "@buffer-zones/shared";
import { LAYER_REGISTRY } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: LayerId[];
  onToggle: (id: LayerId) => void;
}

export function LayerToggles({ visibleLayerIds, onToggle }: LayerTogglesProps) {
  return (
    <div className={styles.drawer}>
      {LAYER_REGISTRY.map((layer) => (
        <label key={layer.id} className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={visibleLayerIds.includes(layer.id)}
            onChange={() => onToggle(layer.id)}
          />
          {layer.label}
        </label>
      ))}
    </div>
  );
}
```

```css
/* packages/web/src/components/LayerToggles/LayerToggles.module.css */
.drawer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toggleRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px; /* touch target */
}

@media (max-width: 768px) {
  .drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 1rem;
    border-top: 1px solid #ddd;
  }
}
```

```typescript
// packages/web/src/components/BasemapToggle/BasemapToggle.tsx
export type Basemap = "street" | "satellite";

interface BasemapToggleProps {
  basemap: Basemap;
  onChange: (basemap: Basemap) => void;
}

export function BasemapToggle({ basemap, onChange }: BasemapToggleProps) {
  const other: Basemap = basemap === "street" ? "satellite" : "street";
  return (
    <button type="button" onClick={() => onChange(other)}>
      Switch to {other}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/components/LayerToggles/LayerToggles.test.tsx src/components/BasemapToggle/BasemapToggle.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/LayerToggles packages/web/src/components/BasemapToggle
git commit -m "feat(web): responsive layer toggle drawer and basemap toggle"
```

---

### Task 15: App composition, attribution overlay, real main entry

**Files:**
- Modify: `packages/web/src/main.tsx` (remove placeholder `App`, import the real one)
- Create: `packages/web/src/App.tsx`, `packages/web/src/App.module.css`
- Test: `packages/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `createTownshipDataRepository` (Task 11), `Map`, `Legend`, `LayerToggles`, `BasemapToggle` (Tasks 13–14), `LAYER_REGISTRY` (Task 12).
- Produces: the composed `<App />` rendered by `main.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/App.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  GeoJSON: () => null,
}));

vi.mock("./data/TownshipDataRepository", () => ({
  createTownshipDataRepository: () => ({
    getTownships: async () => [
      { type: "Feature", properties: { id: "A", name: "Mamelodi", commuteMinutes: 20 }, geometry: null },
    ],
  }),
}));

import { App } from "./App";

describe("App", () => {
  it("loads township data on mount and renders the legend and attribution", async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText(/OpenStreetMap/i)).toBeInTheDocument());
    expect(screen.getByText(/Short/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/App.test.tsx`
Expected: FAIL — `Cannot find module './App'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/web/src/App.tsx
import { useEffect, useState } from "react";
import type { LayerId, TownshipFeature } from "@buffer-zones/shared";
import { Map } from "./components/Map/Map";
import { Legend } from "./components/Legend/Legend";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { BasemapToggle, type Basemap } from "./components/BasemapToggle/BasemapToggle";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { LAYER_REGISTRY } from "./layers/registry";
import styles from "./App.module.css";

const repository = createTownshipDataRepository("/data/townships.v1.geojson");

export function App() {
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<LayerId[]>(
    LAYER_REGISTRY.filter((l) => l.defaultVisible).map((l) => l.id),
  );
  const [basemap, setBasemap] = useState<Basemap>("street");

  useEffect(() => {
    repository.getTownships().then(setTownships);
  }, []);

  function handleToggle(id: LayerId) {
    setVisibleLayerIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  return (
    <div className={styles.app}>
      <Map townships={townships} visibleLayerIds={visibleLayerIds} />
      <aside className={styles.sidebar}>
        <Legend />
        <LayerToggles visibleLayerIds={visibleLayerIds} onToggle={handleToggle} />
        <BasemapToggle basemap={basemap} onChange={setBasemap} />
      </aside>
      <footer className={styles.attribution}>
        &copy; OpenStreetMap contributors | Stats SA | Data current as of 2026
      </footer>
    </div>
  );
}
```

```css
/* packages/web/src/App.module.css */
.app {
  display: grid;
  grid-template-columns: 1fr 320px;
  height: 100vh;
}
.sidebar {
  overflow-y: auto;
  padding: 1rem;
}
.attribution {
  position: absolute;
  bottom: 0;
  left: 0;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.5rem;
}

@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
}
```

```typescript
// packages/web/src/main.tsx
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "leaflet/dist/leaflet.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/App.module.css packages/web/src/App.test.tsx packages/web/src/main.tsx
git commit -m "feat(web): compose App with map, legend, layer toggles, basemap toggle, attribution"
```

---

### Task 16: Deployment config, security headers, robots.txt, license/attribution docs

**Files:**
- Create: `wrangler.jsonc`
- Create: `packages/web/public/_headers`
- Create: `packages/web/public/robots.txt`
- Create: `ATTRIBUTIONS.md`
- Create: `PRIVACY.md`

**Interfaces:**
- Consumes: nothing (config/docs only, no runtime interfaces).
- Produces: deploy-ready config; no other task depends on this one's code.

- [ ] **Step 1: Write the failing test**

Config/doc files aren't unit-testable in the traditional sense; this task's verification step (below) substitutes for a test.

- [ ] **Step 2: (n/a — no test to run before writing)**

- [ ] **Step 3: Write the files**

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "buffer-zones",
  "compatibility_date": "2026-07-27",
  "assets": {
    "directory": "./packages/web/dist"
  }
}
```

```
# packages/web/public/_headers
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' *.cloudflareinsights.com; style-src 'self'; img-src 'self' data: tile.openstreetmap.org; font-src 'self'; connect-src 'self' *.cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'

/index.html
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

```
# packages/web/public/robots.txt
User-agent: *
Allow: /
```

```markdown
<!-- ATTRIBUTIONS.md -->
# Attributions

## Data

- **OpenStreetMap** — © OpenStreetMap contributors, ODbL. Gautrain and A Re Yeng transit data is sourced (in part or fully) via OSM tagging (`operator=Gautrain`, `network=A Re Yeng`).
- **Stats SA** — Census 2011 sub-place boundaries (via Adrian Frith's cleaned export), Statistics South Africa.
- **City of Tshwane** — A Re Yeng route data, Open Data Portal (where available).
- **Basemap tiles** — OpenStreetMap standard tile layer.

## Software

Full list of MIT/BSD/ISC-licensed dependencies: see `THIRD_PARTY_LICENSES.md` (generate via a `license-checker` script before each release).
```

```markdown
<!-- PRIVACY.md -->
# Privacy Policy

_Last updated: 2026-07-27_

Buffer Zones is a static site with no backend, no accounts, no cookies, and no forms. No personal data is collected by the app itself.

**Hosting logs:** Cloudflare, as host, may log standard request metadata (IP, user agent, timestamp) as part of normal operation — see Cloudflare's own privacy policy.

**Analytics:** Cloudflare Web Analytics (cookieless, no cross-site tracking) may be added for page-view counts only.

**Map tiles:** the basemap tile provider may log tile requests (IP address) as part of serving imagery, standard for any web map.

**No location tracking:** the browser's geolocation API is not used.
```

- [ ] **Step 4: Verify**

Run: `cat packages/web/public/_headers` and confirm it parses as valid Cloudflare `_headers` syntax (no tabs, one directive per indented line); run `npx wrangler deploy --dry-run` (does not actually deploy) once `packages/web/dist` exists after a build, to confirm `wrangler.jsonc` is well-formed.
Expected: no parse errors from wrangler.

- [ ] **Step 5: Commit**

```bash
git add wrangler.jsonc packages/web/public/_headers packages/web/public/robots.txt ATTRIBUTIONS.md PRIVACY.md
git commit -m "chore: deployment config, security headers, robots.txt, attribution and privacy docs"
```

---

### Task 17: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run lint`, `npm run test`, `npm run build` scripts already defined at the workspace root (Task 1) and in `packages/web` (Task 9).
- Produces: CI enforcement; no other task depends on this.

- [ ] **Step 1: Write the file**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Verify locally**

Run: `npm run lint && npm run test && npm run build` from the repo root
Expected: all three succeed — this is exactly what CI will run, so verifying it locally first catches config issues before pushing.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, test, and build on PR and push to main"
```

---

### Task 18: Manual verification (dev server + real browser check)

**Files:** none created — this task exercises the app end-to-end.

- [ ] **Step 1: Start the dev server**

Run: `cd packages/web && npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Load the app and check the golden path**

Open the printed URL. Confirm: the map renders centered on Pretoria, the townships choropleth is visible and colored per commute time to nearest job center, clicking a township shows a popup with name/population/commute time/nearest job center (one of the six job centers), the legend shows four buckets with distinct colors, and the OSM/Stats SA/Tshwane attribution footer is visible.

- [ ] **Step 3: Check edge cases**

Toggle Gautrain and A Re Yeng layers on/off — confirm they render as lines. Toggle the unemployment layer — if the pipeline (Task 8) found no real unemployment source, confirm the UI shows a "no data" state rather than fabricated colors/numbers (i.e., the choropleth for that layer shows the `noData` gray, not a fake gradient). Toggle the basemap button — confirm the label flips between street/satellite (satellite tile source is a stretch item if not wired to a real provider; at minimum, confirm the toggle state itself works without crashing).

- [ ] **Step 4: Check responsive breakpoints**

Resize the browser (or use device toolbar) to ~375px, ~768px, and ~1024px+. Confirm the sidebar collapses/hides below 768px per `App.module.css`'s media query, and that layer toggle checkboxes remain tappable (44px min height, set in Task 14).

- [ ] **Step 5: Record the result**

If everything above works, the v1 build is functionally complete. If any step fails, use superpowers:systematic-debugging before making further changes — don't patch symptoms.
