# Security Policy

_Last updated: 2026-07-29_

## Scope

Stratum is a static, client-side single-page application. There is no
backend, no database, no accounts, no authentication, and no user-submitted
data. The deployed surface is Cloudflare Workers serving pre-built static assets
(HTML, JS, CSS, fonts, and GeoJSON files).

In practice this means the realistic security surface is small, and reports are
most useful when they concern:

- Cross-site scripting or other injection in the web app (`packages/web`)
- Weaknesses in the Content Security Policy or other response headers
  (`packages/web/public/_headers`)
- Supply-chain issues in dependencies that actually reach the shipped bundle
- Deployment or hosting misconfiguration (`wrangler.jsonc`)
- Data integrity problems in the offline pipeline (`data-pipeline`) that could
  cause untrusted remote content to be committed into the published GeoJSON

## Supported versions

Only the currently deployed `main` branch is supported. There are no long-lived
release branches and no backports — fixes land on `main` and are deployed from
there.

## Reporting a vulnerability

Please **do not** open a public issue for a suspected vulnerability.

Report it privately through GitHub's private vulnerability reporting:
[github.com/mooship/stratum/security/advisories/new](https://github.com/mooship/stratum/security/advisories/new).

Helpful reports include:

- The affected file, URL, or dependency
- Steps to reproduce, and what an attacker actually gains
- The browser and version if the issue is browser-specific
- Any proof-of-concept you already have

You will normally get an acknowledgement within a few days. Because this is a
volunteer-maintained public-interest project, please allow reasonable time for a
fix before disclosing publicly. Credit will be given in the advisory unless you
ask otherwise.

## Out of scope

The following are not treated as vulnerabilities in this project:

- Missing security headers on third-party hosts (tile providers, data sources)
- Reports generated solely by an automated scanner with no demonstrated impact
- Denial of service against public third-party APIs used by the offline pipeline
  (OSRM, Overpass) — these are not our infrastructure, and abusing them is
  explicitly discouraged
- Rate limiting, brute force, or account enumeration — there are no accounts
- Volumetric denial of service against the static host
- Inaccuracy or staleness of the mapped data itself; that is a data quality
  issue, so please open a normal issue instead

## Handling data responsibly

The project maps geography, not people. Do not open issues or pull requests that
introduce personally identifying information, household-level data, or any data
whose licence does not permit publication. See [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md)
for the sources currently in use and [`PRIVACY.md`](PRIVACY.md) for what the
deployed site does and does not collect.
