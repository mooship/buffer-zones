export const BASEMAPS = {
  street: {
    label: "Street",
    description: "Best for place names, streets, and everyday orientation.",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
    darkUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    darkAttribution:
      "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
    fallbackUrls: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    darkFallbackUrls: [
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    ],
  },
  satellite: {
    label: "Satellite",
    description: "Imagery context for land use and built form checks.",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
  },
} as const;

export type Basemap = keyof typeof BASEMAPS;

type BasemapTileSource = {
  url: string;
  attribution: string;
};

const OPEN_STREET_MAP_ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

export function getBasemapTileSources(
  basemap: Basemap,
  prefersDarkStreetTiles: boolean,
): BasemapTileSource[] {
  if (basemap === "street") {
    const selection = BASEMAPS.street;
    const primary = prefersDarkStreetTiles
      ? {
          url: selection.darkUrl,
          attribution: selection.darkAttribution,
        }
      : {
          url: selection.url,
          attribution: selection.attribution,
        };
    const fallbackUrls = prefersDarkStreetTiles
      ? selection.darkFallbackUrls
      : selection.fallbackUrls;

    return [
      primary,
      ...fallbackUrls.map((url: string) => ({
        url,
        attribution: url.includes("openstreetmap")
          ? OPEN_STREET_MAP_ATTRIBUTION
          : selection.attribution,
      })),
    ];
  }

  const selection = BASEMAPS[basemap];

  return [
    {
      url: selection.url,
      attribution: selection.attribution,
    },
  ];
}
