# Building a new domain

`@karta/core`, `@karta/map`, and `@karta/react` don't know anything about Gauteng, townships, or transit routes — that's all `@karta/app`, the first domain built on the SDK. This guide walks through building a **second** domain from scratch, using only what the SDK packages export, so the pattern isn't something you have to reverse-engineer from the one example.

The domain used throughout is illustrative: **public amenities** — how far each neighbourhood is from its nearest clinic, plus the bus routes serving the area. Swap in your own data and it works the same way.

## 1. Define a `DomainConfig`

A domain is just data: a `DomainConfig` — `{ layers, layerGroups, story? }` — built from the `Layer`/`LayerGroup`/`LayerStyleConfig`/`DomainStory` types in `@karta/core`. Nothing here is web- or Leaflet-specific.

Mirror the file layout `@karta/app` uses for `gauteng-spatial-legacy`: a `layers.ts`, a `layerGroups.ts`, and an `index.ts` that assembles them into one exported constant.

```ts
// domains/public-amenities/layers.ts
import type { Layer } from "@karta/core";

export const PUBLIC_AMENITIES_LAYERS: Layer[] = [
  {
    id: "clinic-distance",
    label: "Distance to nearest clinic",
    description: "Straight-line distance from each neighbourhood to its nearest public clinic.",
    dataSource: ["/data/public-amenities/neighbourhoods.geojson"],
    companionSource: "/data/public-amenities/neighbourhood-boundaries.geojson",
    geometryKind: "choropleth",
    defaultVisible: true,
    available: true,
    interaction: { selectable: true, labelField: "name" },
    style: {
      kind: "choropleth",
      propertyKey: "clinicDistanceKm",
      buckets: [
        { max: 1, color: "#7A9B6E", label: "Near (≤ 1 km)" },
        { max: 3, color: "#C9A227", label: "Moderate (1–3 km)" },
        { max: Number.POSITIVE_INFINITY, color: "#C1502E", label: "Far (> 3 km)" },
      ],
      baseOpacity: 0.4,
    },
  },
  {
    id: "bus-routes",
    label: "Bus routes",
    dataSource: ["/data/public-amenities/bus-routes.geojson"],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: "#3673B8", weight: 3, legendLabel: "Bus routes" },
  },
];
```

```ts
// domains/public-amenities/layerGroups.ts
import type { LayerGroup } from "@karta/core";

export const PUBLIC_AMENITIES_LAYER_GROUPS: LayerGroup[] = [
  {
    id: "transit",
    title: "Transit",
    selectionMode: "independent",
    layerIds: ["bus-routes"],
  },
];
```

```ts
// domains/public-amenities/index.ts
import { PUBLIC_AMENITIES_LAYER_GROUPS } from "./layerGroups";
import { PUBLIC_AMENITIES_LAYERS } from "./layers";

export const PUBLIC_AMENITIES_DOMAIN = {
  layers: PUBLIC_AMENITIES_LAYERS,
  layerGroups: PUBLIC_AMENITIES_LAYER_GROUPS,
};

export { PUBLIC_AMENITIES_LAYER_GROUPS } from "./layerGroups";
export { PUBLIC_AMENITIES_LAYERS } from "./layers";
```

`DomainConfig` only requires `layers` and `layerGroups`. `story` (`{ title, body }`) is optional narrative "why this map exists" copy — omit it if your domain has nothing to say there, and `getStory()` (both `createRegistry(domain).getStory()` and `useDomain().getStory()`) returns `undefined`. `@karta/web` reads it through `useDomain()`/`getStory()` and shows a Story tab alongside layer toggles only when it's present, so a domain without one gets the same single-view panel as before — the SDK doesn't require every domain to have a story. You can still add extra fields beyond what `DomainConfig` itself requires (`@karta/app`'s `GAUTENG_SPATIAL_LEGACY_DOMAIN` also carries an `id`); `createRegistry` and `useDomain()` simply ignore anything past `layers`/`layerGroups`/`story`.

A `Layer`'s `style.kind` — `"choropleth"`, `"line"`, or `"point"` — drives both its Leaflet rendering (via `createLayerConfig`, see below) and its `Legend` entry, so pick it to match the geometry your GeoJSON actually contains. `line`/`point` styles also accept an optional `colorClassification` for data-driven per-feature colour instead of one flat colour — used by `gauteng-spatial-legacy`'s bus-rapid-transit layer to colour each operator's route differently. See [`packages/core/README.md`](../packages/core/README.md) for the full type reference.

## 2. Wire it up

[`packages/core/README.md`](../packages/core/README.md) documents `createRegistry`/`createLayerConfig` in full; in short, `createRegistry(domain)` gives you `getLayers()`/`getLayer(id)`/`getLayerGroups()` — useful outside React (e.g. in the data pipeline) — and `@karta/map`'s `DomainProvider`/`useDomain()` ([`packages/map/README.md`](../packages/map/README.md)) do the same thing via context, so components don't need the domain threaded through props. `createLayerConfig(layer)` converts a `Layer` into the Leaflet `pathOptions`/`styleFn` pair `MapView` and any custom rendering use.

```ts
import { createLayerConfig, createRegistry } from "@karta/core";
import { PUBLIC_AMENITIES_DOMAIN } from "./domains/public-amenities";

const registry = createRegistry(PUBLIC_AMENITIES_DOMAIN);
const layer = registry.getLayer("clinic-distance");
const { styleFn } = createLayerConfig(layer);
```

## 3. Render it

`MapView` and `Legend` (from `@karta/map`) resolve their layers from the nearest `DomainProvider` — pass your domain once at the root, not to every component. `MapView` takes no baked-in bounds, accessible name, or popup component; all three are yours to supply.

```tsx
import { DomainProvider, Legend } from "@karta/map";
import { PUBLIC_AMENITIES_DOMAIN } from "./domains/public-amenities";

const MapView = lazy(async () => {
  const { MapView } = await import("@karta/map/MapView");
  return { default: MapView };
});

function App() {
  return (
    <DomainProvider domain={PUBLIC_AMENITIES_DOMAIN}>
      <MapView
        bounds={[[-34.1, 18.3], [-33.8, 18.7]]}
        ariaLabel="Map of clinic access and bus routes near Cape Town"
        areas={neighbourhoods}
        areaBoundaries={neighbourhoodBoundaries}
        visibleLayerIds={["clinic-distance"]}
        renderFeaturePopup={(props) => <NeighbourhoodPopup properties={props} />}
      />
      <Legend mode="active" visibleLayerIds={["clinic-distance"]} />
    </DomainProvider>
  );
}
```

`areas`/`areaBoundaries` are plain GeoJSON `Feature[]` arrays you fetch and hold in your own state (see below) — `MapView` doesn't fetch the choropleth layer's own data itself, only the overlay (`line`/`point`) layers listed in `visibleLayerIds`, via its internal `useLayerData`.

## 4. Handle the data

Host GeoJSON files matching each layer's `dataSource` URLs. `@karta/core` gives you validation and merging (full reference in [`packages/core/README.md`](../packages/core/README.md)) so a malformed or multi-source dataset fails loudly instead of rendering garbage — in short:

- `fetchFeatureCollection(url, schema?, signal?)` fetches and validates against a Zod schema, defaulting to the generic `featureCollectionSchema`. Write your own schema (with `createFeatureCollectionParser`) if your properties need stricter validation than "some GeoJSON" — `@karta/app`'s `townshipFeatureCollectionSchema` is an example of extending the generic schema with domain-specific required fields.
- `mergeFeatureCollections(collections)` concatenates several `FeatureCollection`s' features into one, for a layer backed by more than one source file.

```ts
import { fetchFeatureCollection, mergeFeatureCollections } from "@karta/core";

const collections = await Promise.all(
  PUBLIC_AMENITIES_DOMAIN.layers
    .find((l) => l.id === "clinic-distance")!
    .dataSource.map((url) => fetchFeatureCollection(url)),
);
const neighbourhoods = mergeFeatureCollections(collections).features;
```

## 5. What you don't need to touch

`@karta/map` and `@karta/react` are consumed as-is — no fork, no subclassing. The only things a new domain needs are:

- A `DomainConfig` (this guide's subject).
- Domain-specific popup/browser UI, passed in via `MapView`'s `renderFeaturePopup` prop — these read domain-specific properties (like `clinicDistanceKm` above) that don't exist on a generic `Layer`, so they stay in your app, not the SDK. See `@karta/map`'s README, "what doesn't belong here."

That's it — the same `MapView`, `Legend`, `DomainProvider`, theme hooks, and basemap registry that render `gauteng-spatial-legacy` render any other domain built this way.
