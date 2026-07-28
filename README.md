# Buffer Zones

Apartheid-era spatial planning still shapes access to economic opportunity in South African cities today. **Buffer Zones** maps recognized Tshwane township areas, formal transit routes, and modeled car time to selected job centers. The car layer is a baseline spatial proxy, not an observed commute or a measure of public-transport access.

**v1 scope: Pretoria/Tshwane.** The app uses Stats SA Census 2011 boundaries, modeled OSRM car routing to eight selected job centers, and Gautrain rail, Gautrain Bus, A Re Yeng trunk, and PRASA route overlays. Route geometry shows where formal transit runs, not service frequency, reliability, waiting, transfers, or jobs reachable. Other South African metros are scaffolded for future data work — see [`docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md`](docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md).

## Why

Under apartheid, townships were deliberately separated from economic centers by distance and buffer strips of highways, industrial zoning, or vacant land. That geography did not disappear in 1994. This project makes the spatial structure visible while being explicit about what its current data cannot yet establish. The intended primary accessibility measure is the number of jobs reachable within 45, 60, and 90 minutes by public transport, including walking, waiting, and transfers.

## Documentation

- [`docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md`](docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md) — what v1 actually builds and why it diverges from the full spec
- [`docs/superpowers/plans/2026-07-27-buffer-zones-v1.md`](docs/superpowers/plans/2026-07-27-buffer-zones-v1.md) — the task-by-task implementation plan
- [`docs/superpowers/plans/2026-07-28-spatial-legacy-evidence.md`](docs/superpowers/plans/2026-07-28-spatial-legacy-evidence.md) — the evidence roadmap and data requirements
- [`data-pipeline/README.md`](data-pipeline/README.md) — how to (re-)run the data pipeline

## Stack

React + TypeScript SPA (Vite, `react-leaflet`, CSS Modules), a Node/TypeScript offline data pipeline (public OSRM for routing, Overpass API + open data portals for transit, no Docker/GDAL required), and Cloudflare Workers for static hosting. No backend, no accounts, no tracking beyond cookieless page views.

## Development

```bash
npm install
npm run test    # Vitest across all workspaces
npm run build   # type-check + build packages/web
npm run dev --workspace @buffer-zones/web
```

To regenerate the map data, see [`data-pipeline/README.md`](data-pipeline/README.md).

## License

[AGPL-3.0](LICENSE) — a public-interest data project; forks that host a modified version must share their source too. See [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) for data and software attributions and [`PRIVACY.md`](PRIVACY.md) for the privacy policy.
