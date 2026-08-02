import { fetchFeatureCollection, mergeFeatureCollections } from "@stratum/core";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { useDomain } from "../context/DomainContext";

/** Maps a layer id to its fetched `FeatureCollection`, once loaded. */
export type LayerDataMap = Partial<Record<string, FeatureCollection>>;

/**
 * Fetches and merges GeoJSON data for the given layer ids, resolved against
 * the domain registry provided by the nearest `DomainProvider`.
 * @param layerIds - Ids of layers to fetch data for. Unavailable layers are skipped.
 * @returns A map of layer id to its merged `FeatureCollection`, updated as data arrives.
 * @remarks Must be called from within a `DomainProvider`.
 */
export function useLayerData(layerIds: string[]): LayerDataMap {
  const { getLayer } = useDomain();
  const [data, setData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<string>());
  const key = layerIds.join(",");

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
          }
          controllers.delete(requestKey);
        })
        .catch(() => {
          requested.current.delete(requestKey);
          controllers.delete(requestKey);
        });
    }

    return () => {
      cancelled = true;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: getLayer is stable per DomainProvider instance
  }, [key]);

  return data;
}
