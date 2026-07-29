# Data Pipeline

Offline scripts that produce the static GeoJSON files served by the web app. Not an npm workspace — run manually.

## Run

```bash
cd data-pipeline
npm install
npm run run
```

Runs once per metro defined in `@buffer-zones/shared`'s `METROS` (currently Tshwane and Johannesburg), writing each metro's output into its own subfolder: `packages/web/public/data/<metroId>/townships.v1.geojson`, `township-areas.v1.geojson`, `gautrain.v1.geojson`, `gautrain-bus.v1.geojson`, `prasa.v1.geojson`, plus whichever single-city operator is real for that metro (Tshwane: `a-re-yeng.v1.geojson`; Johannesburg: `rea-vaya.v1.geojson`).

`townships.v1.geojson` and `township-areas.v1.geojson` remain the full-resolution
source artifacts. The pipeline also writes compact `.display.v1.geojson`
versions: topology-preserving, quantized and simplified copies used by the
browser. To rebuild only those display artifacts from the committed
full-resolution data, run `npm run display` in this directory.

## Adding a new metro

Add an entry to `METROS` in `packages/shared/src/constants/metros.ts` (id, name, `municipalityCode` from the Stats SA Census 2011 sub-place shapefile, map centre/zoom), add a bounding box to `METRO_BBOX` in `src/constants/metroBbox.ts`, add that metro's job centres to `JOB_CENTERS` in `src/constants/jobCenters.ts`, and add its township area definitions to `packages/shared/src/constants/townships.ts` (see `docs/data/tshwane-area-classification.md` and `docs/data/johannesburg-area-classification.md` for the selection methodology). `run.ts` loops over `METROS` automatically — no other pipeline code needs to change unless the new metro needs its own transit operator (see below).

## Adding a new transit operator

Follow `src/adapters/gautrain.ts`, `src/adapters/aReYeng.ts`, or `src/adapters/reaVaya.ts` as a template: one adapter file with a `fetchX(bbox)` + `normalizeX()` pair, normalizing into the shared `TransitLayerFeatureCollection` shape. Add a registry entry in `packages/web/src/layers/registry.ts` (scoped to the right metro via `getLayerDefinitions`'s `isTshwane`/`isJohannesburg` flags), wire the fetch into the relevant metro branch of `runMetro()` in `run.ts`, and re-run the pipeline; see the v1 design document in `docs/superpowers/specs/`.

Gautrain rail, Gautrain Bus, and PRASA/Metrorail are Gauteng-wide networks fetched for every metro; A Re Yeng (Tshwane only) and Rea Vaya (Johannesburg only) are each a single city's own BRT operator, entirely absent from the other metro's layer list rather than shown disabled (`packages/web/src/layers/registry.ts`). All five are real, live layers. MyCiTi (Cape Town) and Durban Transport belong to metros not in `METROS` yet, so they're withheld from every current metro the same way, until those cities are added. Metrobus (Johannesburg's own conventional bus operator) was tried as a real Overpass adapter on 2026-07-29 but OSM coverage turned out to be a single verified stop with no route geometry, too sparse to ship — see design doc §8.

## Running a single metro

`npm run run -- <metroId>` (e.g. `npm run run -- johannesburg`) runs only that metro instead of looping over all of `METROS` — useful when re-running after a failure partway through, to avoid re-fetching a metro that already succeeded and burning through rate-limit budget for no reason.

## Rate limits

Drive-time computation uses the public `router.project-osrm.org` demo server, batched at 50 origins per request (against all job centers in the same table request) with a 1s delay between batches and retry-with-backoff on HTTP 429. Overpass queries retry with backoff and rotate across a small list of public mirrors (`overpass-api.de`, `overpass.kumi.systems`, `overpass.private.coffee` — see `src/constants/serviceUrls.ts`) before giving up, since a single public instance can be temporarily rate-limited (429) or overloaded (504) under sustained pipeline use.

## Running locally without rate limits

For heavy iteration (e.g. re-running the whole pipeline repeatedly while developing), self-host both services instead of relying on the public ones:

1. Download a South Africa OSM extract (small enough to process locally, unlike the full planet): [`south-africa-latest.osm.pbf`](https://download.geofabrik.de/africa/south-africa-latest.osm.pbf) from Geofabrik, into `data-pipeline/osm-data/`.
2. Pre-process it for OSRM (one-off, only needs re-running if the extract changes) using the car profile bundled with the OSRM Docker image:
   ```bash
   cd data-pipeline
   mkdir -p osrm-data && cp osm-data/south-africa-latest.osm.pbf osrm-data/
   docker run -t -v "${PWD}/osrm-data:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/south-africa-latest.osm.pbf
   docker run -t -v "${PWD}/osrm-data:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/south-africa-latest.osrm
   docker run -t -v "${PWD}/osrm-data:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/south-africa-latest.osrm
   ```
3. Start both services: `docker compose up` (see `docker-compose.yml`; the Overpass container needs a few minutes on first start to import the extract).
4. Point the pipeline at them and run as usual:
   ```bash
   OSRM_BASE_URL=http://localhost:5000 OVERPASS_URL=http://localhost:12345/api/interpreter npm run run
   ```

Only `src/constants/serviceUrls.ts` reads these environment variables — no other pipeline code needs to change to use local infrastructure instead of the public defaults.
