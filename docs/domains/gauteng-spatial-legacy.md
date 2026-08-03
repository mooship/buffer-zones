# Gauteng spatial legacy

This is one domain built on the Stratum SDK — the reference implementation that proves the SDK out end-to-end with a real, published app. It is not what Stratum itself is about: a different domain built on the same SDK could map flood risk, public amenities, or anything else, and would carry none of this framing. See the root [`README.md`](../../README.md) for the SDK itself.

## What it maps

This domain maps apartheid-era spatial planning legacy across South African cities: recognized township areas, formal transit routes, and modeled car time to selected job centers in a single combined view. The car layer is a baseline spatial proxy, not an observed commute or a measure of public-transport access.

**Current scope: full Gauteng municipality coverage in one combined regional layer.** The app currently includes City of Tshwane, City of Johannesburg, City of Ekurhuleni, Emfuleni, Midvaal, Lesedi, Mogale City, Rand West City, and Merafong City. It uses Stats SA Census 2011 boundaries, modeled OSRM car routing to each municipality's selected job centers, and transit overlays sourced from Gautrain rail, Gautrain Bus, PRASA rail, A Re Yeng, and Rea Vaya. Route geometry shows where formal transit runs, not service frequency, reliability, waiting, transfers, or jobs reachable. Other South African metros (Cape Town, Durban) are not yet included, and this domain is not the only one the SDK is meant to support — it's the first proof of concept.

## Why

Under apartheid, townships were deliberately separated from economic centers by distance and buffer strips of highways, industrial zoning, or vacant land. That geography did not disappear in 1994. This reference app makes that spatial structure visible while being explicit about what its current data cannot yet establish, and doubles as the proving ground for the underlying SDK. The intended primary accessibility measure is the number of jobs reachable within 45, 60, and 90 minutes by public transport, including walking, waiting, and transfers.

## Area classification by metro

How included township and settlement areas are selected and displayed, one doc per metro:

- [`docs/data/tshwane-area-classification.md`](../data/tshwane-area-classification.md)
- [`docs/data/johannesburg-area-classification.md`](../data/johannesburg-area-classification.md)
- [`docs/data/ekurhuleni-area-classification.md`](../data/ekurhuleni-area-classification.md)
- [`docs/data/emfuleni-area-classification.md`](../data/emfuleni-area-classification.md)
- [`docs/data/midvaal-area-classification.md`](../data/midvaal-area-classification.md)
- [`docs/data/lesedi-area-classification.md`](../data/lesedi-area-classification.md)
- [`docs/data/mogale-city-area-classification.md`](../data/mogale-city-area-classification.md)
- [`docs/data/rand-west-city-area-classification.md`](../data/rand-west-city-area-classification.md)
- [`docs/data/merafong-city-area-classification.md`](../data/merafong-city-area-classification.md)

## Related

- [`packages/app/README.md`](../../packages/app/README.md) — `@stratum/app`, the domain data and constants this domain is built from
- [`data-pipeline/README.md`](../../data-pipeline/README.md) — how to (re-)run the data pipeline that produces this domain's GeoJSON
- [`docs/design-system.md`](../design-system.md) — the reference app's Material-informed local design system, tokens, and shared UI primitives
