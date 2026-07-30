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

  it("lets Kudube override the broader Temba main-place grouping", () => {
    const result = createTownshipAreas([
      township("Temba Unit 1", 0, "799008006"),
      township("Kudube Unit 10", 1, "799008002"),
      township("Sekampaneng", 2, "799008012"),
    ]);

    const areaNames = result.features.map((feature) => feature.properties.name);
    expect(areaNames.sort()).toEqual(["Kudube", "Temba"]);
  });

  it("lets Plastic View override the broader Soshanguve main-place grouping", () => {
    const result = createTownshipAreas([
      township("Soshanguve Block T", 0, "799014001"),
      township("Plastic View", 1, "799014063"),
    ]);

    const areaNames = result.features.map((feature) => feature.properties.name);
    expect(areaNames.sort()).toEqual(["Plastic View", "Soshanguve"]);
  });

  it("lets named Soweto sub-places override the broader Soweto main-place grouping", () => {
    const result = createTownshipAreas([
      township("Soweto SP", 0, "798030001"),
      township("Klipspruit", 1, "798030045"),
      township("Protea South", 2, "798030091"),
      township("Slovoville", 3, "798030025"),
    ]);

    const areaNames = result.features.map((feature) => feature.properties.name);
    expect(areaNames.sort()).toEqual([
      "Klipspruit",
      "Protea South",
      "Slovoville",
      "Soweto",
    ]);
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

  it("publishes configured label offsets for exceptional labels", () => {
    const result = createTownshipAreas([
      township("Saulsville SP", 0, "799058001"),
    ]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toMatchObject({
      id: "saulsville",
      labelOffset: [0, 18],
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
