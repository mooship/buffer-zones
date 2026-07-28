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

  it("publishes classification metadata and excludes non-residential sub-places", () => {
    const result = createTownshipAreas([
      township("Ekangala SP", 0, "799055001"),
      township("Ekangala Section A", 1, "799055002"),
      township("Ekandustria", 2, "799055007"),
    ]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "ekangala",
      name: "Ekangala",
      labelPriority: "secondary",
      selectionBasis: "census-main-place",
      subPlaceCount: 2,
    });
  });

  it("selects named township sub-places without dissolving their mixed main place", () => {
    const result = createTownshipAreas([
      township("Lotus Gardens", 0, "799047004"),
      township("Lotus Gardens Ext 2", 1, "799047005"),
      township("Pretoria Central", 2, "799047071"),
    ]);

    const lotusGardens = result.features.find(
      (feature) => feature.properties.name === "Lotus Gardens",
    );
    expect(lotusGardens?.properties.subPlaceCount).toBe(2);
  });
});
