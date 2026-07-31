import type { LayerId } from "@buffer-zones/shared";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { getLayerDefinition } from "../layers/registry";

export type LayerDataMap = Partial<Record<LayerId, FeatureCollection>>;

export function useLayerData(layerIds: LayerId[]): LayerDataMap {
  const [data, setData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<string>());
  const key = layerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const controllers = new Map<string, AbortController>();

    const ids = key.length > 0 ? (key.split(",") as LayerId[]) : [];

    for (const id of ids) {
      const requestKey = `national:${id}`;
      if (requested.current.has(requestKey)) {
        continue;
      }
      const definition = getLayerDefinition(id);
      if (!definition?.available) {
        continue;
      }

      requested.current.add(requestKey);
      const controller = new AbortController();
      controllers.set(requestKey, controller);

      fetchFeatureCollection(
        definition.dataSource,
        undefined,
        controller.signal,
      )
        .then((collection) => {
          if (!cancelled) {
            setData((current) => ({ ...current, [id]: collection }));
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
