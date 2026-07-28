# Buffer Zones

Apartheid-era spatial planning still shapes commute times and access to economic opportunity in South African cities today. **Buffer Zones** visualizes this with a choropleth map of townships/suburbs colored by real drive time to the nearest major job center — making the physical "buffer zones" (highways, industrial land, empty veld) between townships and wealthy suburbs visible and quantifiable.

**v1 scope: Pretoria/Tshwane.** Real Stats SA boundary data, real drive-time routing (via public OSRM) to six real job centers (Pretoria CBD, Menlyn, Centurion, Rosslyn, Hatfield, Waterkloof/Brooklyn), and real Gautrain + A Re Yeng transit overlays. Other South African metros are scaffolded for a future pipeline run — see [`docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md`](docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md).

## Why

Under apartheid, townships were deliberately built far from jobs, separated by "buffer strips" of highway, industrial zoning, or vacant land. That geography didn't disappear in 1994 — it still determines who spends two hours a day commuting and who spends twenty minutes. This project makes that pattern visible with real data rather than assertion.

## Documentation

- [`docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md`](docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md) — what v1 actually builds and why it diverges from the full spec
- [`docs/superpowers/plans/2026-07-27-buffer-zones-v1.md`](docs/superpowers/plans/2026-07-27-buffer-zones-v1.md) — the task-by-task implementation plan
- [`data-pipeline/README.md`](data-pipeline/README.md) — how to (re-)run the data pipeline

## Stack

React + TypeScript SPA (Vite, `react-leaflet`, CSS Modules), a Node/TypeScript offline data pipeline (public OSRM for routing, Overpass API + open data portals for transit, no Docker/GDAL required), and Cloudflare Workers for static hosting. No backend, no accounts, no tracking beyond cookieless page views.

## Development

```bash
npm install
npm run test    # Vitest across all workspaces
npm run build   # type-check + build packages/web
npm run dev     # --workspace=packages/web
```

To regenerate the map data, see [`data-pipeline/README.md`](data-pipeline/README.md).

## License

[AGPL-3.0](LICENSE) — a public-interest data project; forks that host a modified version must share their source too. See [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) for data and software attributions and [`PRIVACY.md`](PRIVACY.md) for the privacy policy.
