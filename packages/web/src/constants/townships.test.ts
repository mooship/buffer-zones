import { describe, expect, it } from "vitest";
import {
  TOWNSHIP_AREA_DEFINITIONS,
  getTownshipAreaDefinition,
  getTownshipGroup,
} from "./townships";

describe("township groups", () => {
  it("groups township extensions under their recognizable place name", () => {
    expect(getTownshipGroup("Mamelodi Ext 17")).toBe("Mamelodi");
    expect(getTownshipGroup("Mahube Valley", "799045028")).toBe("Mamelodi");
    expect(getTownshipGroup("Kudube Unit 10", "799008002")).toBe("Temba");
    expect(getTownshipGroup("Pretoria Central")).toBeUndefined();
  });

  it("includes broader Tshwane township and settlement areas by Census grouping", () => {
    expect(getTownshipGroup("Ekangala Section C", "799055004")).toBe(
      "Ekangala",
    );
    expect(getTownshipGroup("Nellmapius Ext 6", "799054001")).toBe(
      "Nellmapius",
    );
    expect(getTownshipGroup("Saulsville SP", "799058001")).toBe("Saulsville");
    expect(getTownshipGroup("Olievenhoutbos Ext 21", "799078003")).toBe(
      "Olievenhoutbosch",
    );
    expect(TOWNSHIP_AREA_DEFINITIONS).toHaveLength(60);
  });

  it("uses exact names for township areas inside mixed Census main places", () => {
    expect(getTownshipGroup("Lotus Gardens", "799047004")).toBe(
      "Lotus Gardens",
    );
    expect(getTownshipGroup("Pretoria Central", "799047071")).toBeUndefined();
    expect(getTownshipGroup("Ekandustria", "799055007")).toBeUndefined();
    expect(
      getTownshipGroup("Tswaing Nature Reserve", "799014001"),
    ).toBeUndefined();
  });

  it("records how each area was selected and how prominently it is labeled", () => {
    expect(getTownshipAreaDefinition("Mamelodi SP", "799045001")).toMatchObject(
      {
        name: "Mamelodi",
        selectionBasis: "census-main-place",
        labelPriority: "primary",
      },
    );
    expect(
      getTownshipAreaDefinition("Lotus Gardens", "799047004"),
    ).toMatchObject({
      name: "Lotus Gardens",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
    });
  });
});
