import { registerBasemap } from "@stratum/map";

/**
 * Overrides `@stratum/map`'s generic `voyager` basemap with a light/dark
 * style pair tinted to this app's `--color-*` design tokens, served from
 * `public/styles/voyager-{light,dark}.json`.
 * @remarks Must run once, client-side, before `MapView` mounts.
 * @remarks Both style documents are derived from OSM Liberty
 *   (https://github.com/hyperknot/openfreemap-styles/tree/main/styles/liberty
 *   -- style JSON: BSD license; design: CC-BY 4.0 via OpenMapTiles), served
 *   over OpenFreeMap's tiles (`https://tiles.openfreemap.org/planet`), the
 *   same source/sprite/glyph endpoints as `@stratum/map`'s stock `voyager`
 *   basemap, so attribution (pulled from the live TileJSON at render time)
 *   is unaffected. Only a curated subset of layers' `paint` colours were
 *   patched: background, water, waterway labels, park/landcover, buildings,
 *   the two admin-boundary tiers (`boundary_2`/`boundary_3`), and text/halo
 *   colours for every place, POI, and road-name label. Road casing/fill
 *   colours were left as upstream's -- conventional highway colours aid
 *   scanability, and recolouring ~50 near-duplicate road layers by hand
 *   risked silent id typos for little visual gain. Regenerate by re-fetching
 *   upstream's `styles/liberty/style.json`, replacing `__TILEJSON_DOMAIN__`
 *   with `tiles.openfreemap.org`, and re-applying the same per-layer colour
 *   overrides for each of this app's light/dark token sets (see `--color-*`
 *   in `src/index.css`).
 */
export function registerVoyagerBasemap(): void {
  registerBasemap("voyager", {
    kind: "vector",
    label: "Voyager",
    description: "Vector-tile basemap with sharper labels at every zoom level.",
    styleUrl: "/styles/voyager-light.json",
    darkStyleUrl: "/styles/voyager-dark.json",
  });
}
