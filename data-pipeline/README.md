# Data Pipeline

Offline scripts that produce the static GeoJSON files served by the web app. Not an npm workspace — run manually.

## Run

```bash
cd data-pipeline
npm install
npm run run
```

Outputs `townships.v1.geojson`, `gautrain.v1.geojson`, `prasa.v1.geojson`, `a-re-yeng.v1.geojson` into `packages/web/public/data/`.

## Adding a new metro or transit operator

Follow `src/adapters/gautrain.ts` or `src/adapters/aReYeng.ts` as a template: one adapter file with a `fetchX()` + `normalizeX()` pair, normalizing into the shared `TransitLayerFeatureCollection` shape. Add a registry entry in `packages/web/src/layers/registry.ts`, and re-run the pipeline. No other pipeline or map code needs to change (see SPEC.md §11).

Currently stubbed (no typed adapter written yet): MyCiTi, Rea Vaya, Metrobus, Durban Transport — see design doc §8. Gautrain, PRASA, and A Re Yeng are the three real, live adapters.

## Rate limits

Drive-time computation uses the public `router.project-osrm.org` demo server, batched at 50 origins per request (against all job centers in the same table request) with a 1s delay between batches and retry-with-backoff on HTTP 429. For heavier use, self-host OSRM (see SPEC.md §3) and swap the base URL in `src/osrmClient.ts`.
