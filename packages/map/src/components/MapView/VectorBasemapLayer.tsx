import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface VectorBasemapLayerProps {
  /** URL of a MapLibre GL style JSON document to render as the basemap. */
  styleUrl: string;
}

/**
 * Renders a MapLibre GL vector-tile basemap as a Leaflet layer.
 * @remarks Must be rendered inside a `MapContainer`. Loads `maplibre-gl` and
 *   `@maplibre/maplibre-gl-leaflet` lazily via dynamic `import()` — `maplibre-gl`
 *   alone is a ~270KB gzipped dependency, and most sessions (on a raster
 *   basemap) never need it. Recreates the MapLibre GL layer whenever
 *   `styleUrl` changes (e.g. switching a light/dark style).
 */
export function VectorBasemapLayer({ styleUrl }: VectorBasemapLayerProps) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let layer: import("leaflet").MaplibreGL | undefined;

    Promise.all([
      import("@maplibre/maplibre-gl-leaflet"),
      import("leaflet"),
    ]).then(([, L]) => {
      if (cancelled) {
        return;
      }
      layer = L.maplibreGL({ style: styleUrl });
      layer.addTo(map);
    });

    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, styleUrl]);

  return null;
}
