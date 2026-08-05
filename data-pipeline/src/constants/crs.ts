/**
 * Hartebeesthoek94 / Lo29 (EPSG:2053) — the Surveyor-General transverse
 * Mercator grid centred on the 29°E meridian, covering Gauteng and its
 * neighbouring provinces.
 * @remarks South African cadastral and survey shapefiles are frequently
 *   published in this CRS (or a neighbouring `Lo` zone, e.g. Lo27/Lo31)
 *   rather than WGS84. `fetchMetroBoundaries`'s `sourceCrs` parameter exists
 *   for exactly this case — pass this constant (or the correct `Lo` zone for
 *   the source in question) if a future boundary source needs reprojecting
 *   before it reaches `@stratum/core`'s WGS84-only GeoJSON contract.
 *   Definition verified against the EPSG registry (`epsg-index` package,
 *   code 2053) on 2026-08-05; today's Census 2011 sub-place source is
 *   already WGS84, so this constant has no current call site.
 */
export const HARTEBEESTHOEK94_LO29 =
  "+proj=tmerc +axis=wsu +lat_0=0 +lon_0=29 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs";
