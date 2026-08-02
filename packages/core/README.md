# `@stratum/core`

Domain-agnostic layer model and geodata utilities for Stratum. Has no dependency on `@stratum/app`, `@stratum/map`, `@stratum/react`, `@stratum/web`, or React — the first package extracted towards a reusable SDK for geospatial layer platforms beyond Stratum's own Gauteng domain.

## What belongs here

- **Layer/domain types** (`types/layer.ts`) — `Layer`, `LayerGroup`, `DomainConfig`, and every style config type (`ChoroplethLayerStyle`, `LineLayerStyle`, `PointLayerStyle`, `ColorBucket`, `LayerInteraction`, `LayerGroupSelectionMode`). `LineLayerStyle`/`PointLayerStyle` also accept an optional `Classification<T>` (`GraduatedClassification` for numeric ranges, `CategorizedClassification` for exact string match) on `colorClassification`/`weightClassification`/`radiusClassification`, for data-driven styling of any geometry kind — not just choropleth fill color. The flat `color`/`weight`/`radius` fields remain required as the fallback/no-classification value.
- **`resolveClassification(classification, properties)`** (`layers/classification.ts`) — resolves a feature's properties through a `Classification<T>` to its style output value; used internally by `createLayerConfig` and exported for direct use (e.g. custom legend rendering).
- **`createLayerConfig(layer, noDataColor?)`** (`layers/createLayerConfig.ts`) — converts a `Layer` descriptor into a Leaflet `pathOptions`/`styleFn` configuration. Returns a `styleFn` (instead of static `pathOptions`) for `line`/`point` layers that declare a classification.
- **`createRegistry(domain)`** (`layers/createRegistry.ts`) — a read-only `getLayers`/`getLayer`/`getLayerGroups` accessor over a `DomainConfig`.
- **Geodata utils** (`data/`) — `fetchFeatureCollection`, `mergeFeatureCollections`, and the Zod schemas in `geoJsonSchemas.ts` (`featureCollectionSchema`, `polygonGeometrySchema`, `multiPolygonGeometrySchema`, `createFeatureCollectionParser`).

Every export is JSDoc-documented (TSDoc-compatible).

## What doesn't belong here

- React or Leaflet runtime rendering code (see `@stratum/map`).
- Anything specific to the Gauteng domain — job centres, township names, transit operator names, colour choices for a particular map (see `@stratum/app`).
- Browser-only hooks like dark-mode/theme detection (see `@stratum/react`).

## Usage

```ts
import { createRegistry, createLayerConfig } from "@stratum/core";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";

const registry = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);
const layer = registry.getLayer("townships");
const { styleFn } = createLayerConfig(layer);
```
