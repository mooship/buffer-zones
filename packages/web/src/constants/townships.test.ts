import { describe, expect, it } from "vitest";
import { getTownshipGroup, isTownshipLabelFeature } from "./townships";

describe("township groups", () => {
  it("groups township extensions under their recognizable place name", () => {
    expect(getTownshipGroup("Mamelodi Ext 17")).toBe("Mamelodi");
    expect(getTownshipGroup("Mahube Valley", "799045028")).toBe("Mamelodi");
    expect(getTownshipGroup("Kudube Unit 10", "799008002")).toBe("Temba");
    expect(getTownshipGroup("Pretoria Central")).toBeUndefined();
  });

  it("selects one representative sub-place for a persistent label", () => {
    expect(isTownshipLabelFeature("Mamelodi SP")).toBe(true);
    expect(isTownshipLabelFeature("Soshanguve A")).toBe(true);
    expect(isTownshipLabelFeature("Eersterust Ext 2")).toBe(true);
    expect(isTownshipLabelFeature("Temba Unit 1")).toBe(true);
    expect(isTownshipLabelFeature("Mamelodi Ext 17")).toBe(false);
  });
});
