import { fetchFeatureCollection, mergeFeatureCollections } from "@stratum/core";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { useDomain } from "../context/DomainContext";

/** Maps a layer id to its fetched `FeatureCollection`, once loaded. */
export type LayerDataMap = Partial<Record<string, FeatureCollection>>;

/** Result of `useLayerData`: fetched data, plus ids of layers whose fetch failed. */
export interface LayerDataResult {
  data: LayerDataMap;
  failedLayerIds: string[];
}

/**
 * Fetches and merges GeoJSON data for the given layer ids, resolved against
 * the domain registry provided by the nearest `DomainProvider`.
 * @param layerIds - Ids of layers to fetch data for. Unavailable layers are skipped.
 * @returns The merged `FeatureCollection` per layer id, plus ids of layers whose
 *   fetch failed (logged via `console.error`). A failed layer is retried if its id
 *   is removed from `layerIds` and passed again.
 * @remarks Must be called from within a `DomainProvider`.
 */
export function useLayerData(layerIds: string[]): LayerDataResult {
  const { getLayer } = useDomain();
  const [data, setData] = useState<LayerDataMap>({});
  const [failedLayerIds, setFailedLayerIds] = useState<string[]>([]);
  const requested = useRef(new Set<string>());
  const key = layerIds.join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: getLayer is stable per DomainProvider instance
  useEffect(() => {
    let cancelled = false;
    const controllers = new Map<string, AbortController>();

    const ids = key.length > 0 ? key.split(",") : [];

    for (const id of ids) {
      const definition = getLayer(id);
      if (!definition?.available) {
        continue;
      }

      const requestKey = `${id}:${definition.dataSource.join(",")}`;
      if (requested.current.has(requestKey)) {
        continue;
      }

      requested.current.add(requestKey);
      const controller = new AbortController();
      controllers.set(requestKey, controller);

      Promise.all(
        definition.dataSource.map((source) =>
          fetchFeatureCollection(source, undefined, controller.signal),
        ),
      )
        .then((collections) => {
          if (!cancelled) {
            setData((current) => ({
              ...current,
              [id]: mergeFeatureCollections(collections),
            }));
            setFailedLayerIds((current) =>
              current.includes(id) ? current.filter((f) => f !== id) : current,
            );
          }
          controllers.delete(requestKey);
        })
        .catch((error) => {
          requested.current.delete(requestKey);
          controllers.delete(requestKey);
          if (!cancelled) {
            console.error(`Failed to load layer data for "${id}"`, error);
            setFailedLayerIds((current) =>
              current.includes(id) ? current : [...current, id],
            );
          }
        });
    }

    return () => {
      cancelled = true;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
  }, [key]);

  return { data, failedLayerIds };
}
