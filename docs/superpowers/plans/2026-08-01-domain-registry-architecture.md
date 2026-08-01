# Domain Registry & Routing Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded single-domain wiring (`layers/registry.ts`, `App.tsx`, `useMapUiStore.ts`, routing) with a domain registry and a `/d/:domainId` route, so a second domain can be added without touching `packages/web` core code.

**Architecture:** `packages/shared` gains a `Domain` type and a `DOMAINS` registry (`getDomain(domainId)`). `packages/web`'s `registry.ts`, `useLayerData`, and `useMapUiStore` become domain-parameterized rather than importing `GAUTENG_SPATIAL_LEGACY_DOMAIN` directly. React Router (framework mode, v8) gets a `/d/:domainId` route; `/` redirects to the default domain.

**Tech Stack:** TypeScript, React 19, React Router v8 framework mode (file-based routes, typegen `+types`), Zustand, Vitest, `@testing-library/react`.

## Global Constraints

- TDD: write the failing test before implementation, every task.
- No code comments unless capturing a non-obvious *why*.
- British English in user-facing copy only (not identifiers).
- Existing e2e specs and `App.test.tsx` must keep passing or be updated in the same task that changes their assumptions — no task leaves the suite red.
- `npm run test` (root) and `npm run typecheck` must pass after every task's commit.

---

### Task 1: `Domain` type and `DOMAINS` registry in `packages/shared`

**Files:**
- Create: `packages/shared/src/types/domain.ts`
- Create: `packages/shared/src/constants/domains.ts`
- Create: `packages/shared/src/constants/domains.test.ts`
- Modify: `packages/shared/src/domains/gauteng-spatial-legacy/index.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `Domain { id: string; regionId: string; layers: Layer[]; layerGroups: LayerGroup[]; story: { title: string; body: string } }`, `DOMAINS: readonly Domain[]`, `DEFAULT_DOMAIN_ID: string`, `getDomain(domainId: string): Domain | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/constants/domains.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_DOMAIN_ID, DOMAINS, getDomain } from "./domains";

describe("domains registry", () => {
  it("includes the gauteng-spatial-legacy domain with a regionId", () => {
    const domain = getDomain("gauteng-spatial-legacy");
    expect(domain?.regionId).toBe("gauteng");
    expect(domain?.layers.length).toBeGreaterThan(0);
    expect(domain?.layerGroups.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown domain id", () => {
    expect(getDomain("does-not-exist")).toBeUndefined();
  });

  it("DEFAULT_DOMAIN_ID resolves to a real domain", () => {
    expect(getDomain(DEFAULT_DOMAIN_ID)).toBeDefined();
  });

  it("every domain in DOMAINS is reachable by its own id", () => {
    for (const domain of DOMAINS) {
      expect(getDomain(domain.id)).toBe(domain);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/constants/domains.test.ts`
Expected: FAIL — `./domains` has no exported member (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/types/domain.ts
import type { Layer, LayerGroup } from "./genericLayer";

export interface DomainStory {
  title: string;
  body: string;
}

export interface Domain {
  id: string;
  regionId: string;
  layers: Layer[];
  layerGroups: LayerGroup[];
  story: DomainStory;
}
```

```ts
// packages/shared/src/constants/domains.ts
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "../domains/gauteng-spatial-legacy";
import type { Domain } from "../types/domain";

export const DEFAULT_DOMAIN_ID = "gauteng-spatial-legacy";

export const DOMAINS: readonly Domain[] = [
  GAUTENG_SPATIAL_LEGACY_DOMAIN,
] as const satisfies readonly Domain[];

export function getDomain(domainId: string): Domain | undefined {
  return DOMAINS.find((domain) => domain.id === domainId);
}
```

Modify `packages/shared/src/domains/gauteng-spatial-legacy/index.ts`:

```ts
import type { Domain } from "../../types/domain";
import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

export const GAUTENG_SPATIAL_LEGACY_DOMAIN: Domain = {
  id: "gauteng-spatial-legacy",
  regionId: "gauteng",
  layers: GAUTENG_SPATIAL_LEGACY_LAYERS,
  layerGroups: GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS,
  story: {
    title: "Why this map exists",
    body: "Apartheid law controlled where Black, Coloured and Indian people could live. Black townships were deliberately separated from economic centres; those distances still shape access to work.",
  },
};

export { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";
export { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
```

Add to `packages/shared/src/index.ts` (after the existing `export * from "./domains/gauteng-spatial-legacy";` line):

```ts
export * from "./types/domain";
export * from "./constants/domains";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/constants/domains.test.ts`
Expected: PASS (4 tests)

Also run: `npm run typecheck --workspace @stratum/shared` — expect no errors (confirms `GAUTENG_SPATIAL_LEGACY_DOMAIN` satisfies `Domain`).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/domain.ts packages/shared/src/constants/domains.ts packages/shared/src/constants/domains.test.ts packages/shared/src/domains/gauteng-spatial-legacy/index.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Domain type and DOMAINS registry"
```

---

### Task 2: `packages/web/src/layers/registry.ts` becomes domain-parameterized

**Files:**
- Modify: `packages/web/src/layers/registry.ts`
- Modify: `packages/web/src/layers/registry.test.ts`

**Interfaces:**
- Consumes: `getDomain(domainId)` from Task 1.
- Produces: `getLayers(domainId: string): readonly Layer[]`, `getLayer(domainId: string, id: string): Layer | undefined`, `getLayerGroups(domainId: string): readonly LayerGroup[]` — **signature change**, every caller in Tasks 3–7 must pass `domainId` as the first argument.

- [ ] **Step 1: Write the failing test**

```ts
// packages/web/src/layers/registry.test.ts
import { describe, expect, it } from "vitest";
import { getLayer, getLayerGroups, getLayers } from "./registry";

describe("registry", () => {
  it("returns the 6 gauteng-spatial-legacy layers for that domain", () => {
    const layers = getLayers("gauteng-spatial-legacy");
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

  it("returns an empty array for an unknown domain", () => {
    expect(getLayers("does-not-exist")).toEqual([]);
  });

  it("every layer dataSource points at a per-region geojson URL", () => {
    for (const layer of getLayers("gauteng-spatial-legacy")) {
      for (const url of layer.dataSource) {
        expect(url).toMatch(/^\/data\/[\w-]+\/[\w.-]+\.geojson$/);
      }
    }
  });

  it("looks up a single layer by domain and id", () => {
    expect(getLayer("gauteng-spatial-legacy", "rapid-rail")?.label).toBe(
      "Rapid Rail",
    );
    expect(getLayer("gauteng-spatial-legacy", "does-not-exist")).toBeUndefined();
    expect(getLayer("does-not-exist", "rapid-rail")).toBeUndefined();
  });

  it("returns the 2 layer groups for that domain", () => {
    const groups = getLayerGroups("gauteng-spatial-legacy");
    expect(groups.map((g) => g.id)).toEqual([
      "access-to-opportunity",
      "transit-networks",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: FAIL — `getLayers("gauteng-spatial-legacy")` type error / old signature ignores the argument, `getLayers("does-not-exist")` returns the full Gauteng array instead of `[]`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/layers/registry.ts
import { getDomain } from "@stratum/shared";
import type { Layer, LayerGroup } from "@stratum/shared";

export function getLayers(domainId: string): readonly Layer[] {
  return getDomain(domainId)?.layers ?? [];
}

export function getLayer(domainId: string, id: string): Layer | undefined {
  return getDomain(domainId)?.layers.find((layer) => layer.id === id);
}

export function getLayerGroups(domainId: string): readonly LayerGroup[] {
  return getDomain(domainId)?.layerGroups ?? [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/layers/registry.test.ts`
Expected: PASS (5 tests). Note: `packages/web` will not typecheck as a whole until Tasks 3–7 update every caller — that's expected and fixed by those tasks, not this one.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/layers/registry.ts packages/web/src/layers/registry.test.ts
git commit -m "feat(web): make layer registry domain-parameterized"
```

---

### Task 3: `useLayerData` takes a `domainId` and fetches `companionSource`

**Files:**
- Modify: `packages/web/src/hooks/useLayerData.ts`
- Modify: `packages/web/src/hooks/useLayerData.test.ts`

**Interfaces:**
- Consumes: `getLayer(domainId, id)` from Task 2.
- Produces: `useLayerData(domainId: string, layerIds: string[]): { data: LayerDataMap; companionData: LayerDataMap }` — **breaking change** from `useLayerData(layerIds): LayerDataMap`. `LayerDataMap = Partial<Record<string, FeatureCollection>>` (unchanged shape, now nested under `.data`/`.companionData`).

- [ ] **Step 1: Write the failing test**

Add to `packages/web/src/hooks/useLayerData.test.ts` (alongside existing tests, all of which get a `"gauteng-spatial-legacy"` domainId argument added to their `useLayerData(...)` calls and `.data`/`result.current.data` instead of `result.current` — apply that rename across every existing `it` block in this file as part of this step):

```ts
it("also fetches a layer's companionSource and exposes it separately", async () => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ type: "FeatureCollection", features: [] }),
  } as Response);

  const { result } = renderHook(() =>
    useLayerData("gauteng-spatial-legacy", ["townships"]),
  );

  await waitFor(() => {
    expect(result.current.companionData).toHaveProperty("townships");
  });
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/data/gauteng/township-areas.display.v1.geojson"),
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/hooks/useLayerData.test.ts`
Expected: FAIL — `result.current.companionData` is `undefined` (hook doesn't return that shape yet), and existing tests fail to compile/typecheck against the new `domainId` argument until Step 3.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/hooks/useLayerData.ts
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { mergeFeatureCollections } from "../data/mergeFeatureCollections";
import { getLayer } from "../layers/registry";

export type LayerDataMap = Partial<Record<string, FeatureCollection>>;

export interface LayerDataResult {
  data: LayerDataMap;
  companionData: LayerDataMap;
}

export function useLayerData(
  domainId: string,
  layerIds: string[],
): LayerDataResult {
  const [data, setData] = useState<LayerDataMap>({});
  const [companionData, setCompanionData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<string>());
  const key = `${domainId}|${layerIds.join(",")}`;

  useEffect(() => {
    let cancelled = false;
    const controllers = new Map<string, AbortController>();

    const ids = layerIds.length > 0 ? layerIds : [];

    for (const id of ids) {
      const definition = getLayer(domainId, id);
      if (!definition?.available) {
        continue;
      }

      const requestKey = `${id}:${definition.dataSource.join(",")}:${definition.companionSource ?? ""}`;
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
        })
        .catch(() => {
          requested.current.delete(requestKey);
        })
        .finally(() => {
          controllers.delete(requestKey);
        });

      if (definition.companionSource) {
        fetchFeatureCollection(
          definition.companionSource,
          undefined,
          controller.signal,
        )
          .then((collection) => {
            if (!cancelled) {
              setCompanionData((current) => ({ ...current, [id]: collection }));
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      cancelled = true;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: key encodes domainId+layerIds
  }, [key]);

  return { data, companionData };
}
```

Update every existing test in `useLayerData.test.ts` to call `useLayerData("gauteng-spatial-legacy", [...])` and read `result.current.data` (rename `result.current` → `result.current.data` in each assertion, e.g. `expect(result.current.data).toHaveProperty("rapid-rail")`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/hooks/useLayerData.test.ts`
Expected: PASS (all tests, including the new companionSource one)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useLayerData.ts packages/web/src/hooks/useLayerData.test.ts
git commit -m "feat(web): thread domainId through useLayerData and fetch companionSource"
```

---

### Task 4: `useMapUiStore` becomes domain-aware without an SSR-unsafe module-level default

**Files:**
- Modify: `packages/web/src/stores/useMapUiStore.ts`
- Modify: `packages/web/src/stores/useMapUiStore.test.ts`

**Why this shape:** `createInitialState()` currently calls `getLayers()` at *module import time* (`useMapUiStore.ts:39–53`, before this task). Once `getLayers` needs a `domainId`, that call can't happen at import time — there is no domain yet. Cloudflare Workers can serve concurrent requests within one isolate, so a module-level "current domain" would be a cross-request race; the domain must live in the store's own state, set explicitly by the component once it knows which route matched.

**Interfaces:**
- Consumes: `getLayerGroups(domainId)`, `getLayers(domainId)` from Task 2.
- Produces: new store field `domainId: string | null`, new action `initializeForDomain(domainId: string): void` (sets `domainId` and recomputes `visibleLayerIds` from that domain's default-visible layers). `toggleLayer` unchanged in name/signature but now reads `domainId` from store state internally. **Breaking change:** initial `visibleLayerIds` is now `[]` until `initializeForDomain` runs — callers (Task 6/7's `App.tsx`) must call it on mount.

- [ ] **Step 1: Write the failing test**

```ts
// packages/web/src/stores/useMapUiStore.test.ts — replace the "initializes with default state" test and add:
it("has no layers visible before a domain is initialized", () => {
  const state = useMapUiStore.getState();
  expect(state).toMatchObject({
    domainId: null,
    visibleLayerIds: [],
    basemap: "street",
    panelOpen: false,
    titleExpanded: false,
    selectedFeatureId: null,
  });
});

it("initializeForDomain sets domainId and default-visible layers for that domain", () => {
  act(() => {
    useMapUiStore.getState().initializeForDomain("gauteng-spatial-legacy");
  });
  const state = useMapUiStore.getState();
  expect(state.domainId).toBe("gauteng-spatial-legacy");
  expect(state.visibleLayerIds).toEqual(["townships"]);
});
```

Also update the two existing tests ("toggles layer visibility", "keeps modeled car time and nearest-transit mutually exclusive") to call `useMapUiStore.getState().initializeForDomain("gauteng-spatial-legacy")` inside their own `beforeEach`/first line, since `toggleLayer`'s exclusivity logic now depends on `domainId` being set.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/stores/useMapUiStore.test.ts`
Expected: FAIL — `initializeForDomain` is not a function; `domainId` is `undefined`, not `null`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/stores/useMapUiStore.ts
import { create } from "zustand";
import type { Basemap } from "../constants/basemaps";
import { getLayerGroups, getLayers } from "../layers/registry";

function findGroupContaining(domainId: string, id: string) {
  return getLayerGroups(domainId).find((group) => group.layerIds.includes(id));
}

function isExclusiveGroupMember(domainId: string, id: string): boolean {
  return findGroupContaining(domainId, id)?.selectionMode === "exclusive";
}

function groupSiblings(domainId: string, id: string): string[] {
  const group = findGroupContaining(domainId, id);
  if (!group || group.selectionMode !== "exclusive") {
    return [];
  }
  return group.layerIds.filter((sibling) => sibling !== id);
}

export type PanelView = "story" | "places" | "layers";

interface MapUiState {
  domainId: string | null;
  visibleLayerIds: string[];
  basemap: Basemap;
  panelOpen: boolean;
  panelView: PanelView;
  titleExpanded: boolean;
  selectedFeatureId: string | null;
  initializeForDomain: (domainId: string) => void;
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
    domainId: null as string | null,
    visibleLayerIds: [] as string[],
    basemap: "street" as const,
    panelOpen: false,
    panelView: "story" as const,
    titleExpanded: false,
    selectedFeatureId: null,
  };
}

export const useMapUiStore = create<MapUiState>()((set, get) => ({
  ...createInitialState(),
  initializeForDomain: (domainId) =>
    set({
      domainId,
      visibleLayerIds: getLayers(domainId)
        .filter((layer) => layer.defaultVisible)
        .map((layer) => layer.id),
    }),
  toggleLayer: (id) =>
    set((state) => {
      const { domainId } = get();
      if (!domainId) {
        return state;
      }
      if (state.visibleLayerIds.includes(id)) {
        return {
          visibleLayerIds: state.visibleLayerIds.filter(
            (existing) => existing !== id,
          ),
        };
      }

      if (isExclusiveGroupMember(domainId, id)) {
        const siblings = groupSiblings(domainId, id);
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/stores/useMapUiStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/stores/useMapUiStore.ts packages/web/src/stores/useMapUiStore.test.ts
git commit -m "feat(web): make map UI store domain-aware via initializeForDomain"
```

---

### Task 5: `/d/:domainId` route, `/` redirects to the default domain

**Files:**
- Modify: `packages/web/src/routes.ts`
- Create: `packages/web/src/routes/domain.tsx`
- Create: `packages/web/src/routes/domain.test.tsx`
- Modify: `packages/web/src/routes/home.tsx`
- Create: `packages/web/src/routes/home.test.tsx`

**Interfaces:**
- Consumes: `getDomain(domainId)`, `DEFAULT_DOMAIN_ID` from `@stratum/shared` (Task 1).
- Produces: route `/d/:domainId` rendering `<App domainId={params.domainId} />` (Task 7 gives `App` that prop); route `/` issuing a `redirect()` to `/d/${DEFAULT_DOMAIN_ID}`; both routes throw a 404 `Response` for an unknown `domainId` via `loader`.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/routes/domain.test.tsx
import { describe, expect, it } from "vitest";
import { loader } from "./domain";

describe("domain route loader", () => {
  it("returns the domainId for a known domain", async () => {
    const result = await loader({
      params: { domainId: "gauteng-spatial-legacy" },
    } as never);
    expect(result).toEqual({ domainId: "gauteng-spatial-legacy" });
  });

  it("throws a 404 Response for an unknown domain", async () => {
    await expect(
      loader({ params: { domainId: "does-not-exist" } } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});
```

```tsx
// packages/web/src/routes/home.test.tsx
import { describe, expect, it } from "vitest";
import { loader } from "./home";

describe("home route loader", () => {
  it("redirects to the default domain", async () => {
    const response = await loader();
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/d/gauteng-spatial-legacy",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/routes/domain.test.tsx packages/web/src/routes/home.test.tsx`
Expected: FAIL — `./domain` module doesn't exist; `home.tsx` exports no `loader`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/web/src/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("/d/:domainId", "./routes/domain.tsx"),
] satisfies RouteConfig;
```

```tsx
// packages/web/src/routes/domain.tsx
import { getDomain } from "@stratum/shared";
import type { MetaFunction } from "react-router";
import { App } from "../App";
import type { Route } from "./+types/domain";

export async function loader({ params }: Route.LoaderArgs) {
  const domain = getDomain(params.domainId);
  if (!domain) {
    throw new Response("Domain not found", { status: 404 });
  }
  return { domainId: params.domainId };
}

export const meta: MetaFunction = ({ params }) => {
  const domain = getDomain(params.domainId ?? "");
  return [
    { title: domain ? `Stratum — ${domain.story.title}` : "Stratum" },
    { name: "description", content: domain?.story.body ?? "" },
  ];
};

export default function DomainRoute({ loaderData }: Route.ComponentProps) {
  return <App domainId={loaderData.domainId} />;
}
```

```ts
// packages/web/src/routes/home.tsx
import { DEFAULT_DOMAIN_ID } from "@stratum/shared";
import { redirect } from "react-router";

export function loader() {
  return redirect(`/d/${DEFAULT_DOMAIN_ID}`);
}

export default function HomeRoute() {
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/routes/domain.test.tsx packages/web/src/routes/home.test.tsx`
Expected: PASS

Also run: `npm run typecheck --workspace @stratum/web` — the `Route` typegen types regenerate from `routes.ts`; if `+types/domain` isn't found, run `npm run dev --workspace @stratum/web -- --once` or the project's typegen script first (check `packages/web/package.json` for a `react-router typegen` script) before typechecking again.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/routes.ts packages/web/src/routes/domain.tsx packages/web/src/routes/domain.test.tsx packages/web/src/routes/home.tsx packages/web/src/routes/home.test.tsx
git commit -m "feat(web): add /d/:domainId route, redirect / to the default domain"
```

---

### Task 6: `root.tsx` keeps default-domain preload, drops the hardcoded apartheid meta description

**Files:**
- Modify: `packages/web/src/root.tsx`

**Why:** `LinksFunction` in this React Router version takes no arguments (`() => LinkDescriptor[]`, confirmed against `node_modules/react-router/dist/development/lib/types/route-module-annotations.d.ts`) — it cannot read `params.domainId`. Per-domain GeoJSON preload therefore can't be made fully correct in `root.tsx` itself; this task keeps root's preload scoped to the default domain (correct for `/` → redirect → default domain, the common case) and documents the gap rather than silently leaving stale copy. Per-domain `<title>`/description already comes from `routes/domain.tsx`'s `meta` export (Task 5), which *does* receive `params`/`loaderData` and overrides root's fallback meta.

- [ ] **Step 1: Write the failing test**

There is no existing `root.test.tsx`; add one asserting the preload links target the default domain's layers, and that the fallback meta no longer hardcodes "apartheid":

```tsx
// packages/web/src/root.test.tsx
import { describe, expect, it } from "vitest";
import { links, meta } from "./root";

describe("root", () => {
  it("preloads the default domain's geojson layers", () => {
    const hrefs = links().map((link) =>
      "href" in link ? link.href : undefined,
    );
    expect(hrefs).toContain("/data/gauteng/townships.display.v1.geojson");
  });

  it("fallback meta description does not hardcode a specific domain's story", () => {
    const tags = meta({} as never);
    const description = tags.find(
      (tag) => "name" in tag && tag.name === "description",
    );
    expect(description).toMatchObject({
      name: "description",
      content: "A geospatial layer platform for public-interest data.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/root.test.tsx`
Expected: FAIL — `getGeoJsonPreloadLinks()` still calls the old zero-arg `getLayers()` (now returns `[]` post-Task 2, since `domainId` is required), so no hrefs are produced; `meta` still returns the apartheid-specific description.

- [ ] **Step 3: Write minimal implementation**

Modify `packages/web/src/root.tsx`:

```tsx
import interStylesHref from "@fontsource-variable/inter/index.css?url";
import martianMonoStylesHref from "@fontsource-variable/martian-mono/index.css?url";
import { DEFAULT_DOMAIN_ID } from "@stratum/shared";
import leafletStylesHref from "leaflet/dist/leaflet.css?url";
import {
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import appStylesHref from "./index.css?url";
import { getLayers } from "./layers/registry";

function getGeoJsonPreloadLinks() {
  const defaultVisibleByUrl = new Map<string, boolean>();
  for (const layer of getLayers(DEFAULT_DOMAIN_ID)) {
    for (const source of layer.dataSource) {
      const isDefaultVisible = defaultVisibleByUrl.get(source) ?? false;
      defaultVisibleByUrl.set(source, isDefaultVisible || layer.defaultVisible);
    }
  }

  return Array.from(defaultVisibleByUrl, ([href, defaultVisible]) => ({
    rel: "preload" as const,
    href,
    as: "fetch" as const,
    crossOrigin: "anonymous" as const,
    ...(defaultVisible ? {} : { fetchPriority: "low" as const }),
  }));
}

export const meta: MetaFunction = () => {
  return [
    { title: "Stratum" },
    {
      name: "description",
      content: "A geospatial layer platform for public-interest data.",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
    },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: interStylesHref },
  { rel: "stylesheet", href: martianMonoStylesHref },
  { rel: "stylesheet", href: leafletStylesHref },
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32x32.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/favicon-16x16.png",
  },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "preconnect", href: "https://tile.openstreetmap.org" },
  { rel: "preconnect", href: "https://basemaps.cartocdn.com" },
  ...getGeoJsonPreloadLinks(),
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="theme-color"
          content="#edeff2"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#23262c"
          media="(prefers-color-scheme: dark)"
        />
        <script src="/theme-bootstrap.js" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/root.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/root.tsx packages/web/src/root.test.tsx
git commit -m "feat(web): default-domain geojson preload, domain-agnostic fallback meta"
```

---

### Task 7: `App.tsx` takes a `domainId` prop, drops the direct domain import and the parallel township fetch

**Files:**
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `getDomain(domainId)` (`@stratum/shared`), `useLayerData(domainId, layerIds)` (Task 3, returns `{data, companionData}`), `useMapUiStore().initializeForDomain(domainId)` (Task 4).
- Produces: `App({ domainId }: { domainId: string })` — **breaking change** from the current no-props `App()`. `HomeRoute`/`DomainRoute` (Task 5) are the only callers.

**Note on scope:** this task removes the bespoke `useEffect`/`buildRegionDataUrls`/`createTownshipDataRepository` fetch path and the direct `GAUTENG_SPATIAL_LEGACY_DOMAIN` import. It does **not** generalize `TownshipBrowser`/`EvidenceSummary` into domain-agnostic components — that's the follow-up "FeatureBrowser generalization" plan. For this task, the "places" tab and the job-center evidence copy stay conditional on `domainId === "gauteng-spatial-legacy"`, a small and honest bridge, not a hidden hardcode: every other domain simply doesn't get a "places" tab or job-center count until the follow-up plan lands.

- [ ] **Step 1: Write the failing test**

Modify `packages/web/src/App.test.tsx`: every `render(<App />)` call becomes `render(<App domainId="gauteng-spatial-legacy" />)` (apply across the whole file — this is a mechanical rename, not new test logic). Add:

```tsx
it("calls initializeForDomain with the given domainId on mount", async () => {
  render(<App domainId="gauteng-spatial-legacy" />);
  await waitFor(() => {
    expect(useMapUiStore.getState().domainId).toBe("gauteng-spatial-legacy");
  });
});

it("fetches township data via useLayerData's companionSource, not a bespoke effect", async () => {
  render(<App domainId="gauteng-spatial-legacy" />);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/gauteng/township-areas.display.v1.geojson"),
      expect.anything(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/App.test.tsx`
Expected: FAIL — `App` doesn't accept a `domainId` prop yet; existing bespoke fetch path doesn't call `initializeForDomain`.

- [ ] **Step 3: Write minimal implementation**

Modify `packages/web/src/App.tsx`:

Replace the import block (lines 1–39 in the pre-task file) — drop `GAUTENG_SPATIAL_LEGACY_DOMAIN`, `METROS`, `TownshipFeature`, `buildRegionDataUrls`, `createTownshipDataRepository`, `fetchFeatureCollection`, `mergeFeatureCollections`:

```tsx
import { getDomain } from "@stratum/shared";
import clsx from "clsx";
import { Layers, X } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";
import styles from "./App.module.css";
import { ControlButton } from "./components/ControlButton/ControlButton";
import { DesktopLegend } from "./components/DesktopLegend/DesktopLegend";
import { EvidenceSummary } from "./components/EvidenceSummary/EvidenceSummary";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { LocationSearchControl } from "./components/LocationSearchControl/LocationSearchControl";
import { MobileLegend } from "./components/MobileLegend/MobileLegend";
import { SettingsMenu } from "./components/SettingsMenu/SettingsMenu";
import { TownshipBrowser } from "./components/TownshipBrowser/TownshipBrowser";
import { DATA_SOURCES, REPOSITORY_URL } from "./constants/metadata";
import type { LocationSearchResult } from "./data/locationSearch";
import {
  setThemePreference,
  useThemePreference,
} from "./hooks/useThemePreference";
import { useLayerData } from "./hooks/useLayerData";
import { type PanelView, useMapUiStore } from "./stores/useMapUiStore";
```

Replace `NATIONAL_JOB_CENTER_COUNT` (removed — job-center evidence is Gauteng-specific and no longer computed at module scope from `METROS`) and add:

```tsx
const GAUTENG_JOB_CENTER_COUNT = 58;
```

(58 is `METROS.reduce((total, metro) => total + metro.jobCenterCount, 0)`'s current value: `packages/shared/src/constants/metros.ts` has 9 metros with `jobCenterCount` 8, 8, 6, 6, 6, 6, 6, 6, 6.)

Replace the component signature and the two `useState`/`useEffect` blocks that owned `townships`/`townshipAreas`/`dataError`/`loadAttempt` (pre-task lines 69–165):

```tsx
export function App({ domainId }: { domainId: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [mobileSheetDragging, setMobileSheetDragging] = useState(false);
  const [focusLocationTarget, setFocusLocationTarget] =
    useState<FocusLocationTarget | null>(null);
  const domain = getDomain(domainId);
  const visibleLayerIds = useMapUiStore((state) => state.visibleLayerIds);
  const basemap = useMapUiStore((state) => state.basemap);
  const panelOpen = useMapUiStore((state) => state.panelOpen);
  const panelView = useMapUiStore((state) => state.panelView);
  const selectedFeatureId = useMapUiStore((state) => state.selectedFeatureId);
  const toggleLayer = useMapUiStore((state) => state.toggleLayer);
  const setBasemap = useMapUiStore((state) => state.setBasemap);
  const setPanelOpen = useMapUiStore((state) => state.setPanelOpen);
  const setPanelView = useMapUiStore((state) => state.setPanelView);
  const setSelectedFeatureId = useMapUiStore(
    (state) => state.setSelectedFeatureId,
  );
  const initializeForDomain = useMapUiStore(
    (state) => state.initializeForDomain,
  );
  const themePreference = useThemePreference();
  const { width } = useWindowSize({ initializeWithValue: false });
  const isDesktopViewport =
    (width ?? MOBILE_BREAKPOINT_PX) > MOBILE_BREAKPOINT_PX;
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suppressNextHandleClickRef = useRef(false);
  const activeSheetPointerIdRef = useRef<number | null>(null);
  const pendingSheetDragOffsetRef = useRef(0);
  const sheetDragFrameRef = useRef<number | null>(null);
  const { data: layerData, companionData: layerCompanionData } = useLayerData(
    domainId,
    visibleLayerIds,
  );
  const townships = layerData.townships?.features ?? [];
  const townshipAreas = layerCompanionData.townships?.features ?? [];
  const dataError =
    visibleLayerIds.length > 0 &&
    visibleLayerIds.every((id) => layerData[id] === undefined);

  useEffect(() => {
    initializeForDomain(domainId);
  }, [domainId, initializeForDomain]);

  useEffect(() => {
    setHydrated(true);
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      setPanelOpen(true);
    }
  }, [setPanelOpen]);
```

(the `prefers-reduced-transparency` effect, the panel-close effect, and the drag-frame cleanup effect are unchanged — keep them as-is from the pre-task file.)

Delete the retry button's `onClick={() => setLoadAttempt((value) => value + 1)}` — `loadAttempt` no longer exists; replace with `onClick={() => initializeForDomain(domainId)}` (re-running `initializeForDomain` re-triggers `useLayerData` since `visibleLayerIds` is recomputed, which changes `useLayerData`'s `key` and retries the fetch).

Gate the "places" tab (per the scope note above):

```tsx
const PANEL_VIEWS =
  domainId === "gauteng-spatial-legacy"
    ? (["story", "places", "layers"] as const)
    : (["story", "layers"] as const);
```

(move this from module scope into the component body, since it now depends on `domainId`; `handleTabKeyDown`'s references to the module-scoped `PANEL_VIEWS` constant become references to this local `const` instead — no other change needed there.)

Update the story panel section to use `domain` instead of the removed import:

```tsx
{panelView === "story" ? (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>{domain?.story.title}</h2>
    <EvidenceSummary
      jobCenterCount={
        domainId === "gauteng-spatial-legacy"
          ? GAUTENG_JOB_CENTER_COUNT
          : undefined
      }
      contextText={domain?.story.body ?? ""}
    />
    ...
  </section>
) : null}
```

`EvidenceSummary`'s `jobCenterCount` prop is currently `jobCenterCount: number` (required) in `packages/web/src/components/EvidenceSummary/EvidenceSummary.tsx:4`. Change it to `jobCenterCount?: number` and wrap its one usage:

```tsx
// packages/web/src/components/EvidenceSummary/EvidenceSummary.tsx — inside the component, replace the <div className={styles.limitation}> block
{jobCenterCount !== undefined ? (
  <div className={styles.limitation}>
    <strong>Car time is only a baseline proxy.</strong>
    <span>
      It shows the fastest modeled drive to the nearest of {jobCenterCount}{" "}
      selected job centres. It does not measure walking, waiting, transfers,
      service frequency or whether a household has access to a car.
    </span>
  </div>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/App.test.tsx`
Expected: PASS. Then run `npm run typecheck --workspace @stratum/web` and `npm run test --workspace @stratum/web` to confirm nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/App.test.tsx packages/web/src/components/EvidenceSummary/EvidenceSummary.tsx
git commit -m "feat(web): App takes domainId prop, drops bespoke township fetch"
```

---

### Task 8: keyboard-accessible domain switcher

**Files:**
- Create: `packages/web/src/components/DomainSwitcher/DomainSwitcher.tsx`
- Create: `packages/web/src/components/DomainSwitcher/DomainSwitcher.module.css`
- Create: `packages/web/src/components/DomainSwitcher/DomainSwitcher.test.tsx`
- Modify: `packages/web/src/App.tsx` (render the switcher)

**Interfaces:**
- Consumes: `DOMAINS` (`@stratum/shared`, Task 1).
- Produces: `DomainSwitcher({ activeDomainId }: { activeDomainId: string })` — renders one `<Link>` per domain in `DOMAINS`.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/components/DomainSwitcher/DomainSwitcher.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DomainSwitcher } from "./DomainSwitcher";

describe("DomainSwitcher", () => {
  it("renders a link per domain with the active one marked current", () => {
    render(
      <MemoryRouter>
        <DomainSwitcher activeDomainId="gauteng-spatial-legacy" />
      </MemoryRouter>,
    );
    const active = screen.getByRole("link", { name: /why this map exists/i });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("href", "/d/gauteng-spatial-legacy");
  });

  it("every link is reachable by keyboard (real anchor elements, no click-only handlers)", () => {
    render(
      <MemoryRouter>
        <DomainSwitcher activeDomainId="gauteng-spatial-legacy" />
      </MemoryRouter>,
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link.tagName).toBe("A");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/src/components/DomainSwitcher/DomainSwitcher.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/web/src/components/DomainSwitcher/DomainSwitcher.tsx
import { DOMAINS } from "@stratum/shared";
import { Link } from "react-router";
import styles from "./DomainSwitcher.module.css";

export function DomainSwitcher({
  activeDomainId,
}: {
  activeDomainId: string;
}) {
  return (
    <nav aria-label="Choose a map" className={styles.switcher}>
      <ul className={styles.list}>
        {DOMAINS.map((domain) => {
          const isActive = domain.id === activeDomainId;
          return (
            <li key={domain.id}>
              <Link
                to={`/d/${domain.id}`}
                className={styles.link}
                aria-current={isActive ? "page" : undefined}
                data-active={isActive}
              >
                {domain.story.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

```css
/* packages/web/src/components/DomainSwitcher/DomainSwitcher.module.css */
.switcher {
  display: flex;
}

.list {
  display: flex;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.link {
  border: 1px solid var(--color-line);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  color: var(--color-ink);
  text-decoration: none;
  font-size: 0.875rem;
}

.link:focus-visible {
  outline: 2px solid var(--color-ochre);
  outline-offset: 2px;
}

.link[data-active="true"] {
  background: var(--color-ochre);
  color: var(--color-paper);
  border-color: var(--color-ochre);
}
```

Render it in `App.tsx`, as a new `<div className={styles.domainSwitcherControl}><DomainSwitcher activeDomainId={domainId} /></div>` sibling of the existing `settingsControl`/`locationSearchControl` divs. Add to `packages/web/src/App.module.css`:

```css
.domainSwitcherControl {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 1240;
}
```

And inside the existing mobile `@media` block that already contains `.settingsControl`/`.locationSearchControl` (`App.module.css:515` onward):

```css
.domainSwitcherControl {
  top: calc(0.75rem + var(--mobile-safe-top));
  right: 0.75rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/src/components/DomainSwitcher/DomainSwitcher.test.tsx packages/web/src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/DomainSwitcher packages/web/src/App.tsx packages/web/src/App.module.css
git commit -m "feat(web): add keyboard-accessible domain switcher"
```

---

## Follow-up plans (not this plan's scope)

- **FeatureBrowser/FeaturePopup generalization** (generalizes `TownshipBrowser`/`TownshipPopup`, removes the `domainId === "gauteng-spatial-legacy"` places-tab gate from Task 7, adds `browsable` config to `Layer`).
- **`gauteng-socioeconomic` domain** (data-pipeline `join` hook per the amended spec §4, new `PipelineSource`, new domain package, registered in `DOMAINS`).
- Per-domain GeoJSON preload correctness (Task 6's documented gap) — revisit if a non-default domain's LCP becomes a measured problem.
