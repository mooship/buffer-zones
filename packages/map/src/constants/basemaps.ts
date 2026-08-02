/** Style configuration for a raster XYZ basemap. */
export interface RasterBasemapDefinition {
  kind: "raster";
  label: string;
  description: string;
  url: string;
  attribution: string;
  darkUrl?: string;
  darkAttribution?: string;
  fallbackUrls?: string[];
  darkFallbackUrls?: string[];
}

/** Style configuration for a vector-tile basemap, rendered via MapLibre GL. */
export interface VectorBasemapDefinition {
  kind: "vector";
  label: string;
  description: string;
  /** URL of a MapLibre GL style JSON document. */
  styleUrl: string;
  /** Style JSON to use instead of `styleUrl` when dark mode is preferred. */
  darkStyleUrl?: string;
}

/** A registered basemap's rendering configuration, raster or vector. */
export type BasemapDefinition =
  | RasterBasemapDefinition
  | VectorBasemapDefinition;

/**
 * Identifier of a registered basemap, e.g. `"street"`.
 * @remarks Any string can be registered via `registerBasemap`.
 */
export type Basemap = string;

const OPEN_STREET_MAP_ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";
const CARTO_ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>";

function defaultBasemaps(): Record<string, BasemapDefinition> {
  return {
    street: {
      kind: "raster",
      label: "Street",
      description: "Best for place names, streets, and everyday orientation.",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: CARTO_ATTRIBUTION,
      darkUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      darkAttribution: CARTO_ATTRIBUTION,
      fallbackUrls: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      darkFallbackUrls: [
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
    },
    satellite: {
      kind: "raster",
      label: "Satellite",
      description: "Imagery context for land use and built form checks.",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
    },
    voyager: {
      kind: "vector",
      label: "Voyager",
      description:
        "Vector-tile basemap with sharper labels at every zoom level.",
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    },
  };
}

function loadDefaultsInto(target: Map<Basemap, BasemapDefinition>): void {
  target.clear();
  for (const [id, definition] of Object.entries(defaultBasemaps())) {
    target.set(id, definition);
  }
}

const registry = new Map<Basemap, BasemapDefinition>();
loadDefaultsInto(registry);

/**
 * Registers (or overwrites) a basemap definition under `id`, making it
 * available to `BasemapToggle` and `MapView`.
 */
export function registerBasemap(
  id: Basemap,
  definition: BasemapDefinition,
): void {
  registry.set(id, definition);
}

/** Ids of every currently registered basemap, in registration order. */
export function getRegisteredBasemapIds(): Basemap[] {
  return [...registry.keys()];
}

/**
 * Looks up a registered basemap's definition.
 * @throws If `id` isn't registered.
 */
export function getBasemapDefinition(id: Basemap): BasemapDefinition {
  const definition = registry.get(id);
  if (!definition) {
    throw new Error(`Unknown basemap: "${id}"`);
  }
  return definition;
}

/**
 * Resets the registry to its built-in defaults (`street`, `satellite`, `voyager`).
 * @remarks For test isolation — the registry is a module-level singleton.
 */
export function resetBasemapRegistry(): void {
  loadDefaultsInto(registry);
}

/** A resolved raster tile source: URL template plus its attribution. */
export interface BasemapTileSource {
  url: string;
  attribution: string;
}

/**
 * Resolves the ordered list of raster tile sources to try for a basemap,
 * primary first followed by fallbacks used when a tile request errors.
 * @param basemap - The selected basemap. Must be a `"raster"` kind.
 * @param prefersDarkStreetTiles - Whether to prefer the dark variant, for
 *   basemaps that define one via `darkUrl`. Ignored for basemaps without one.
 * @returns An ordered array of `{ url, attribution }` tile sources.
 * @throws If `basemap` isn't registered, or isn't a raster basemap.
 */
export function getBasemapTileSources(
  basemap: Basemap,
  prefersDarkStreetTiles: boolean,
): BasemapTileSource[] {
  const definition = getBasemapDefinition(basemap);
  if (definition.kind !== "raster") {
    throw new Error(
      `getBasemapTileSources only supports raster basemaps, got "${basemap}"`,
    );
  }

  const primary =
    prefersDarkStreetTiles && definition.darkUrl
      ? {
          url: definition.darkUrl,
          attribution: definition.darkAttribution ?? definition.attribution,
        }
      : { url: definition.url, attribution: definition.attribution };
  const fallbackUrls =
    (prefersDarkStreetTiles
      ? definition.darkFallbackUrls
      : definition.fallbackUrls) ?? [];

  return [
    primary,
    ...fallbackUrls.map((url) => ({
      url,
      attribution: url.includes("openstreetmap")
        ? OPEN_STREET_MAP_ATTRIBUTION
        : definition.attribution,
    })),
  ];
}
