import { describe, expect, it } from "vitest";
import { createStubTransitLayer } from "./stubTransitLayer";

describe("createStubTransitLayer", () => {
  it("returns a valid, empty TransitLayerFeatureCollection", () => {
    const result = createStubTransitLayer();
    expect(result).toEqual({ type: "FeatureCollection", features: [] });
  });
});
