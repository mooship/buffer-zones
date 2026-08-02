import { describe, expect, it } from "vitest";
import { townshipFeatureCollectionSchema } from "./geoJsonSchemas";

describe("townshipFeatureCollectionSchema", () => {
  it("rejects a non-polygon geometry, unlike the generic feature collection schema", () => {
    const result = townshipFeatureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "1",
            name: "Example",
            commuteMinutes: 10,
            nearestJobCenter: "cbd",
            distanceKm: 1,
          },
          geometry: { type: "Point", coordinates: [28, -25] },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
