import { describe, expect, it } from "vitest";
import type { NormalizedTownship } from "./adapters/boundaries";
import { createTownshipAreas } from "./townshipAreas";

function township(name: string, offset: number, id = name): NormalizedTownship {
  return {
    id,
    name,
    population: undefined,
    centroid: { lat: 0, lon: offset },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [offset, 0],
          [offset + 1, 0],
          [offset + 1, 1],
          [offset, 1],
          [offset, 0],
        ],
      ],
    },
  };
}

describe("createTownshipAreas", () => {
  it("dissolves adjacent sub-places into one township feature", () => {
    const result = createTownshipAreas([
      township("Mamelodi SP", 0),
      township("Mamelodi Ext 1", 1),
      township("Mahube Valley", 2, "799045028"),
    ]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties.name).toBe("Mamelodi");
    expect(result.features[0]?.geometry.type).toBe("Polygon");
  });

  it("uses the Census main-place code for differently named Temba areas", () => {
    const result = createTownshipAreas([
      township("Temba Unit 1", 0, "799008006"),
      township("Kudube Unit 10", 1, "799008002"),
      township("Sekampaneng", 2, "799008012"),
    ]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties.name).toBe("Temba");
  });
});
