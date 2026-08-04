# `@stratum/app`

Gauteng-specific domain data and constants for `gauteng-spatial-legacy`, the reference implementation proving out Stratum's SDK, built on the domain-agnostic model in `@stratum/core`.

## What belongs here

- **`domains/gauteng-spatial-legacy/`** (`layers.ts`, `layerGroups.ts`, `index.ts` exporting `GAUTENG_SPATIAL_LEGACY_DOMAIN`) — the Gauteng layer catalogue (recognised township choropleth, nearest-transit choropleth, and one line layer per transit network), layer groups, and a `story` (`{ title: "Why this map exists", body }`) — `@stratum/core`'s optional `DomainConfig.story` field, surfaced by `@stratum/web` as a Story tab. `layers.ts` imports `Layer` directly from `@stratum/core`.
- **`constants/metros.ts`** — `METROS`, the nine Gauteng municipalities, each tagged with a `regionId`.
- **`constants/regions.ts`** — `REGIONS`, the registry driving per-region output directories and data-fetch URLs (currently one entry, `gauteng`, kind `province`).
- **`constants/townships.ts`** — included township-area groupings per metro.
- **`types/`** — Gauteng-specific GeoJSON/transit contracts (`TownshipFeature`, `TownshipProperties`, transit layer id lists), plus `types/genericLayer.ts`, which re-exports the `Layer`/`LayerGroup` contracts from `@stratum/core` for any other domain built the same way.

## What doesn't belong here

- Generic layer/style types, `createLayerConfig`, `createRegistry`, or geodata fetch/schema utilities — those live in `@stratum/core`.
- Map rendering components or UI primitives — those live in `@stratum/map`.
- Generic React hooks — those live in `@stratum/react`.

## Usage

```ts
import { GAUTENG_SPATIAL_LEGACY_DOMAIN, METROS, REGIONS } from "@stratum/app";
```

Renamed from `packages/shared`/`@stratum/shared`.
