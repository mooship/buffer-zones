import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface VectorBasemapLayerProps {
  /** URL of a MapLibre GL style JSON document to render as the basemap. */
  styleUrl: string;
  /**
   * Called if the style/plugin fails to load, the MapLibre layer fails to
   * initialize, or the style JSON itself fails to load once the layer is
   * attached (e.g. the style host is unreachable), so a caller can fall back
   * to another basemap instead of leaving the map blank. Always logged to
   * `console.error` regardless.
   */
  onError?: (error: unknown) => void;
}

/**
 * Renders a MapLibre GL vector-tile basemap as a Leaflet layer.
 * @remarks Must be rendered inside a `MapContainer`. Loads `maplibre-gl` and
 *   `@maplibre/maplibre-gl-leaflet` lazily via dynamic `import()` — `maplibre-gl`
 *   alone is a ~270KB gzipped dependency, and most sessions (on a raster
 *   basemap) never need it. Recreates the MapLibre GL layer whenever
 *   `styleUrl` changes (e.g. switching a light/dark style).
 */
export function VectorBasemapLayer({
  styleUrl,
  onError,
}: VectorBasemapLayerProps) {
  const map = useMap();

  // biome-ignore lint/correctness/useExhaustiveDependencies: onError intentionally omitted -- it's a public prop with no stability guarantee, so including it could re-fire this effect (tearing down and recreating the MapLibre layer) on every render for callers that don't memoize it
  useEffect(() => {
    let cancelled = false;
    let layer: import("leaflet").MaplibreGL | undefined;

    Promise.all([import("@maplibre/maplibre-gl-leaflet"), import("leaflet")])
      .then(([, L]) => {
        if (cancelled) {
          return;
        }
        layer = L.maplibreGL({ style: styleUrl });
        layer.addTo(map);
        layer.getMaplibreMap().on("error", (event: { error: unknown }) => {
          console.error(
            `Vector basemap style failed to load: ${styleUrl}`,
            event.error,
          );
          if (!cancelled) {
            onError?.(event.error);
          }
        });
      })
      .catch((error) => {
        console.error(`Failed to load vector basemap style ${styleUrl}`, error);
        if (!cancelled) {
          onError?.(error);
        }
      });

    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, styleUrl]);

  return null;
}
