import { describe, expectTypeOf, it } from "vitest";
import type { LayerDefinition, LayerId, LayerType } from "./layer";

describe("LayerDefinition", () => {
  it("accepts a valid choropleth layer definition with a list of data sources", () => {
    const def: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
      dataSource: ["/data/gauteng/townships.v1.geojson"],
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
    };
    expectTypeOf(def.id).toEqualTypeOf<LayerId>();
    expectTypeOf(def.layerType).toEqualTypeOf<LayerType>();
    expectTypeOf(def.dataSource).toEqualTypeOf<readonly string[]>();
  });
});
