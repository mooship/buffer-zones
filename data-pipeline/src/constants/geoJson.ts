/**
 * Decimal places kept for coordinates in written output GeoJSON (~1.1m at
 * the equator).
 * @remarks Every published layer is drawn at metro scale or wider, where a
 *   metre is well under a pixel, so the sixth decimal place this used to
 *   keep only ever cost bytes: one extra digit per coordinate across
 *   hundreds of thousands of them, on files the browser has to download,
 *   `JSON.parse` and hand to Leaflet before the map is usable.
 */
export const GEOJSON_COORDINATE_PRECISION = 5;
