import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { mergeFeatureCollections } from "../data/mergeFeatureCollections";
import { getLayer } from "../layers/registry";

export type LayerDataMap = Partial<Record<string, FeatureCollection>>;

export function useLayerData(layerIds: string[]): LayerDataMap {
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
  }, [key]);

  return data;
}
