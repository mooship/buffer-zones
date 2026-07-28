# Spatial Legacy Evidence Plan

**Goal:** Show how apartheid spatial planning still constrains where historically excluded communities can live and how they reach work, without treating township names as sufficient proof or overstating modeled data.

## Principles

- Distinguish measured results, historical context, and interpretation.
- Use population-weighted measures when demographic counts become available.
- Prefer public-transport access to car travel for the primary accessibility measure.
- Publish source year, geography, method, and limitations beside every result.
- Do not add fare data; it changes frequently and would create an unsustainable maintenance obligation.
- Do not fabricate or infer race, income, or historical classifications from place names.

## Phase 1: Evidence framing and baseline proxy

- [x] State why the map exists and link to historical context.
- [x] Label modeled car time as a baseline proxy rather than an observed commute.
- [x] State that route geometry does not measure service frequency, reliability, walking, waiting or transfers.
- [x] Name public-transport job accessibility as the intended primary measure.

## Phase 2: Demographic evidence

- [ ] Acquire licensed Census small-area counts for population group, household income, employment, and household vehicle access.
- [ ] Join demographic counts by stable Census geography code in the offline pipeline.
- [ ] Publish population-weighted township and non-township comparisons.
- [ ] Add demographic choropleths only after coverage and suppression checks pass.

Candidate source: Statistics South Africa Census 2011 Community Profile data, with Adrian Frith's Census 2011 explorer used for source discovery and validation. Census 2022 small-area data should replace or complement 2011 only when a scriptable official dataset and compatible geography are available.

## Phase 3: Public-transport job access

- [ ] Inventory static GTFS or equivalent schedules for PRASA, A Re Yeng, and Gautrain rail and bus.
- [ ] Reject incomplete mode coverage rather than presenting one operator as the whole network.
- [ ] Compute jobs reachable within 45, 60, and 90 minutes, including walking, waiting, and transfers.
- [ ] Publish schedule dates and disruption limitations.

This phase requires reproducible schedules and employment-location data. Route geometry alone is not sufficient for travel-time accessibility.

## Phase 4: Historical planning geography

- [ ] Locate proclamation maps or archival boundaries for Tshwane Group Areas and forced-removal sites.
- [ ] Confirm reuse rights and record archival citations before digitizing.
- [ ] Digitize with explicit date and uncertainty fields; never present reconstructed boundaries as exact.
- [ ] Add a historical/current comparison view once coverage is adequate.

South African History Online provides historical context under CC BY-NC-SA 4.0, but its Group Areas Act article does not provide reusable Tshwane boundary polygons. Spatial records still require an archive or government source.

## Phase 5: Housing and land-use legacy

- [ ] Source current residential zoning, subsidized-housing locations, and property or rental indicators with stable update policies.
- [ ] Compare affordable housing supply and permitted density with access to employment.
- [ ] Avoid live listings and other high-maintenance sources.

## Acceptance criteria

- Every quantitative claim can be reproduced by the offline pipeline.
- Race and poverty claims use demographic observations, not township-name proxies.
- Public-transport claims include walking, waiting, transfers, and all material modes.
- Historical overlays expose source, date, and reconstruction uncertainty.
- No fare dataset or fare-maintenance workflow is introduced.