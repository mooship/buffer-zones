# Stratum

**Stratum** is a reusable SDK for building public-interest geospatial layer platforms — a domain-agnostic layer model, generic map rendering, and React hooks that any dataset can be wired into, with no accounts and no tracking beyond cookieless page views. `@stratum/core`, `@stratum/map`, and `@stratum/react` are the SDK itself; it doesn't encode any particular geography or story.

`packages/app` and `packages/web` are a reference implementation proving the SDK out end-to-end with one real, published domain: **Gauteng spatial legacy**, mapping apartheid-era spatial planning legacy across South African cities. That's just the first domain built on the SDK — a different one could map flood risk, public amenities, or anything else. See [`docs/domains/gauteng-spatial-legacy.md`](docs/domains/gauteng-spatial-legacy.md) for what it covers, why it exists, and how its per-metro area data is classified.

## Documentation

- [`docs/domains/gauteng-spatial-legacy.md`](docs/domains/gauteng-spatial-legacy.md) — the reference implementation's domain, scope, and per-metro area classification
- [`data-pipeline/README.md`](data-pipeline/README.md) — how to (re-)run the data pipeline
- [`packages/core/README.md`](packages/core/README.md) — `@stratum/core`, the domain-agnostic layer model and geodata utilities
- [`packages/map/README.md`](packages/map/README.md) — `@stratum/map`, generic map rendering components and UI primitives
- [`packages/react/README.md`](packages/react/README.md) — `@stratum/react`, generic React hooks (dark-mode detection, theme preference)
- [`packages/app/README.md`](packages/app/README.md) — `@stratum/app`, the Gauteng-specific domain data and constants

## Stack

React + TypeScript SSR app (React Router framework mode on Vite, `react-leaflet`, Zustand, Zod, CSS Modules) split into five npm workspace packages — `@stratum/core`, `@stratum/map`, `@stratum/react`, `@stratum/app`, and `@stratum/web` — plus a Node/TypeScript offline data pipeline (public OSRM for routing, Overpass API + open data portals for transit, no Docker/GDAL required), and Cloudflare Workers for edge rendering and asset delivery. No accounts and no tracking beyond cookieless page views.

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
