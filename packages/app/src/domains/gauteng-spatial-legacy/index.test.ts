import { describe, expect, it } from "vitest";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "./index";

describe("GAUTENG_SPATIAL_LEGACY_DOMAIN", () => {
  it("bundles id, layers, layerGroups, and story copy", () => {
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.id).toBe("gauteng-spatial-legacy");
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.layers).toHaveLength(6);
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.layerGroups).toHaveLength(2);
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.story.title).toBe(
      "Why this map exists",
    );
    expect(GAUTENG_SPATIAL_LEGACY_DOMAIN.story.body.length).toBeGreaterThan(0);
  });
});
