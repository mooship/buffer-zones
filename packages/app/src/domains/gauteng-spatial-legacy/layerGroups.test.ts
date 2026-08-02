import { describe, expect, it } from "vitest";
import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";

describe("GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS", () => {
  it("defines the access-to-opportunity exclusive group matching today's LayerToggles copy", () => {
    const group = GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS.find(
      (g) => g.id === "access-to-opportunity",
    );
    expect(group?.title).toBe("Accessibility overlays");
    expect(group?.description).toBe(
      "Only one overlay can be active at a time.",
    );
    expect(group?.selectionMode).toBe("exclusive");
    expect(group?.layerIds).toEqual(["townships", "nearest-transit"]);
  });

  it("defines the transit-networks independent group matching today's LayerToggles copy", () => {
    const group = GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS.find(
      (g) => g.id === "transit-networks",
    );
    expect(group?.title).toBe("Transit networks");
    expect(group?.selectionMode).toBe("independent");
    expect(group?.layerIds).toEqual([
      "rapid-rail",
      "bus-rapid-transit",
      "commuter-rail",
      "bus",
    ]);
  });
});
