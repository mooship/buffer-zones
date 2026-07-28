import type { LayerId } from "@buffer-zones/shared";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { getLayerDefinition } from "../layers/registry";

export type LayerDataMap = Partial<Record<LayerId, FeatureCollection>>;

export function useLayerData(layerIds: LayerId[]): LayerDataMap {
  const [data, setData] = useState<LayerDataMap>({});
  const requested = useRef(new Set<LayerId>());
  const key = layerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = key.length > 0 ? (key.split(",") as LayerId[]) : [];

    for (const id of ids) {
      if (requested.current.has(id)) {
        continue;
      }
      const definition = getLayerDefinition(id);
      if (!definition?.available) {
        continue;
      }

      requested.current.add(id);
      fetchFeatureCollection(definition.dataSource)
        .then((collection) => {
          if (!cancelled) {
            setData((current) => ({ ...current, [id]: collection }));
          }
        })
        .catch(() => {
          requested.current.delete(id);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [key]);

  return data;
}
