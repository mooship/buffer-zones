import { describe, expectTypeOf, it } from "vitest";
import type { LayerDefinition, LayerId, LayerType } from "./layer";

describe("LayerDefinition", () => {
  it("accepts a valid choropleth layer definition", () => {
    const def: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
    };
    expectTypeOf(def.id).toEqualTypeOf<LayerId>();
    expectTypeOf(def.layerType).toEqualTypeOf<LayerType>();
  });
});
