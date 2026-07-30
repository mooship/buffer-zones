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
    expect(getTownshipGroup("Kudube Unit 10", "799008002")).toBe("Kudube");
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
    expect(getTownshipGroup("Plastic View", "799014063")).toBe("Plastic View");
    expect(TOWNSHIP_AREA_DEFINITIONS).toHaveLength(67);
  });

  it("tags each area with its metro and includes Johannesburg's townships", () => {
    expect(getTownshipGroup("Alexandra Ext 1", "798027001")).toBe("Alexandra");
    expect(getTownshipGroup("Diepkloof Zone 4", "798030037")).toBe("Soweto");
    expect(getTownshipGroup("Cosmo City", "798020002")).toBe("Cosmo City");
    expect(getTownshipGroup("Eldorado Park", "798026212")).toBe(
      "Eldorado Park",
    );
    expect(getTownshipGroup("Matholesville", "798020063")).toBe(
      "Matholesville",
    );
    expect(
      getTownshipAreaDefinition("Alexandra Ext 1", "798027001"),
    ).toMatchObject({ metroId: "johannesburg" });
    expect(getTownshipAreaDefinition("Mamelodi SP", "799045001")).toMatchObject(
      { metroId: "tshwane" },
    );
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

  it("does not match a name or census id belonging to no defined area", () => {
    expect(getTownshipGroup("Some Other Place", "799099001")).toBeUndefined();
    expect(getTownshipGroup("Some Other Place")).toBeUndefined();
  });

  it("ignores an excluded sub-place name even when it starts with the area name", () => {
    expect(
      getTownshipAreaDefinition("Ekandustria", "799055007"),
    ).toBeUndefined();
  });
});
