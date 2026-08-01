# Stratum

**Stratum** is a public-interest geospatial layer platform. Its first published domain, **Gauteng spatial legacy**, maps apartheid-era spatial planning legacy across South African cities: recognized township areas, formal transit routes, and modeled car time to selected job centers in a single combined view. The car layer is a baseline spatial proxy, not an observed commute or a measure of public-transport access.

**Current scope: full Gauteng municipality coverage in one combined national layer.** The app currently includes City of Tshwane, City of Johannesburg, City of Ekurhuleni, Emfuleni, Midvaal, Lesedi, Mogale City, Rand West City, and Merafong City. It uses Stats SA Census 2011 boundaries, modeled OSRM car routing to each municipality's selected job centers, and transit overlays sourced from Gautrain rail, Gautrain Bus, PRASA rail, A Re Yeng, and Rea Vaya. Route geometry shows where formal transit runs, not service frequency, reliability, waiting, transfers, or jobs reachable. Other South African metros (Cape Town, Durban) are not yet included in the published national layer.

## Why

Under apartheid, townships were deliberately separated from economic centers by distance and buffer strips of highways, industrial zoning, or vacant land. That geography did not disappear in 1994. This project makes the spatial structure visible while being explicit about what its current data cannot yet establish. The intended primary accessibility measure is the number of jobs reachable within 45, 60, and 90 minutes by public transport, including walking, waiting, and transfers.

## Documentation

- [`docs/design-system.md`](docs/design-system.md) — the app's Material-informed local design system, tokens, and shared UI primitives
- [`docs/data/tshwane-area-classification.md`](docs/data/tshwane-area-classification.md) — how included Tshwane township and settlement areas are selected and displayed
- [`docs/data/johannesburg-area-classification.md`](docs/data/johannesburg-area-classification.md) — the same, for Johannesburg
- [`docs/data/ekurhuleni-area-classification.md`](docs/data/ekurhuleni-area-classification.md) — the same, for Ekurhuleni
- [`docs/data/emfuleni-area-classification.md`](docs/data/emfuleni-area-classification.md) — the same, for Emfuleni
- [`docs/data/midvaal-area-classification.md`](docs/data/midvaal-area-classification.md) — the same, for Midvaal
- [`docs/data/lesedi-area-classification.md`](docs/data/lesedi-area-classification.md) — the same, for Lesedi
- [`docs/data/mogale-city-area-classification.md`](docs/data/mogale-city-area-classification.md) — the same, for Mogale City
- [`docs/data/rand-west-city-area-classification.md`](docs/data/rand-west-city-area-classification.md) — the same, for Rand West City
- [`docs/data/merafong-city-area-classification.md`](docs/data/merafong-city-area-classification.md) — the same, for Merafong City
- [`data-pipeline/README.md`](data-pipeline/README.md) — how to (re-)run the data pipeline

## Stack

React + TypeScript SSR app (React Router framework mode on Vite, `react-leaflet`, Zustand, Zod, CSS Modules), a Node/TypeScript offline data pipeline (public OSRM for routing, Overpass API + open data portals for transit, no Docker/GDAL required), and Cloudflare Workers for edge rendering and asset delivery. No accounts and no tracking beyond cookieless page views.

## Contributing

```bash
npm install
npm run dev --workspace @stratum/web
```

[`CONTRIBUTING.md`](CONTRIBUTING.md) covers the full setup, the project conventions, and how to propose data changes. [`SECURITY.md`](SECURITY.md) covers reporting a suspected vulnerability privately.
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) sets expectations for respectful,
inclusive participation in project spaces.

## License

[AGPL-3.0](LICENSE) — a public-interest data project; forks that host a modified version must share their source too. See [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) for data and software attributions and [`PRIVACY.md`](PRIVACY.md) for the privacy policy.
