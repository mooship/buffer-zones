import type { LayerId, MetroId } from "@buffer-zones/shared";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { getLayerDefinition } from "../layers/registry";

export type LayerDataMap = Partial<Record<LayerId, FeatureCollection>>;

export function useLayerData(
  layerIds: LayerId[],
  metroId: MetroId,
): LayerDataMap {
  const [data, setData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<string>());
  const previousMetro = useRef(metroId);
  const key = layerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    if (previousMetro.current !== metroId) {
      previousMetro.current = metroId;
      requested.current.clear();
      setData({});
    }

    const ids = key.length > 0 ? (key.split(",") as LayerId[]) : [];

    for (const id of ids) {
      const requestKey = `${metroId}:${id}`;
      if (requested.current.has(requestKey)) {
        continue;
      }
      const definition = getLayerDefinition(id, metroId);
      if (!definition?.available) {
        continue;
      }

      requested.current.add(requestKey);
      fetchFeatureCollection(definition.dataSource)
        .then((collection) => {
          if (!cancelled) {
            setData((current) => ({ ...current, [id]: collection }));
          }
        })
        .catch(() => {
          requested.current.delete(requestKey);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [key, metroId]);

  return data;
}
