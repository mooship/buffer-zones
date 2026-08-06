import { describe, expect, it } from "vitest";
import {
  getTownshipAreaDefinition,
  getTownshipGroup,
  TOWNSHIP_AREA_DEFINITIONS,
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
    expect(TOWNSHIP_AREA_DEFINITIONS).toHaveLength(133);
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
    expect(
      getTownshipAreaDefinition("Thembisa Ext 11", "797001001"),
    ).toMatchObject({ metroId: "ekurhuleni", name: "Tembisa" });
    expect(
      getTownshipAreaDefinition("Tokoza Ext 2", "797002001"),
    ).toMatchObject({ metroId: "ekurhuleni", name: "Thokoza" });
    expect(
      getTownshipAreaDefinition("Sebokeng Unit 7", "760004005"),
    ).toMatchObject({ metroId: "emfuleni", name: "Sebokeng" });
    expect(getTownshipGroup("Sharpeville SP", "760013001")).toBe("Sharpeville");
    expect(
      getTownshipGroup("Vanderbijlpark CE 1", "760009033"),
    ).toBeUndefined();
    expect(
      getTownshipGroup("Vereeniging Central", "760006031"),
    ).toBeUndefined();
    expect(getTownshipGroup("Mamello", "761011001")).toBe("Mamello");
    expect(getTownshipGroup("Ratanda Ext 4", "762015002")).toBe("Ratanda");
    expect(getTownshipGroup("Kagiso Ext 12", "763011003")).toBe("Kagiso");
    expect(getTownshipGroup("Mohlakeng Ext 2", "764004001")).toBe("Mohlakeng");
    expect(getTownshipGroup("Bekkersdal Ext 6", "765002001")).toBe(
      "Bekkersdal",
    );
    expect(getTownshipGroup("Khutsong South", "766003001")).toBe("Khutsong");
    expect(getTownshipAreaDefinition("Mamello", "761011001")).toMatchObject({
      metroId: "midvaal",
    });
    expect(
      getTownshipAreaDefinition("Ratanda Ext 4", "762015002"),
    ).toMatchObject({ metroId: "lesedi" });
    expect(
      getTownshipAreaDefinition("Kagiso Ext 12", "763011003"),
    ).toMatchObject({ metroId: "mogale-city" });
    expect(
      getTownshipAreaDefinition("Mohlakeng Ext 2", "764004001"),
    ).toMatchObject({ metroId: "rand-west-city" });
    expect(
      getTownshipAreaDefinition("Khutsong South", "766003001"),
    ).toMatchObject({ metroId: "merafong-city" });
  });

  it("prefers a census-code match when two metros share the same area name", () => {
    expect(getTownshipGroup("Stretford Ext 2", "760001001")).toBe("Stretford");
    expect(
      getTownshipAreaDefinition("Stretford Ext 2", "760001001"),
    ).toMatchObject({ metroId: "emfuleni" });
    expect(getTownshipAreaDefinition("Stretford", "798038001")).toMatchObject({
      metroId: "johannesburg",
    });
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
    expect(
      getTownshipAreaDefinition("Saulsville SP", "799058001"),
    ).toMatchObject({
      name: "Saulsville",
      labelOffset: [0, 18],
    });
  });

  it("does not match a name or census id belonging to no defined area", () => {
    expect(getTownshipGroup("Some Other Place", "799099001")).toBeUndefined();
    expect(getTownshipGroup("Some Other Place")).toBeUndefined();
  });

  it("keeps memoised lookups keyed on both name and census id", () => {
    expect(getTownshipAreaDefinition("Stretford Ext 2", "760001001")).toBe(
      getTownshipAreaDefinition("Stretford Ext 2", "760001001"),
    );
    expect(getTownshipAreaDefinition("Stretford", "798038001")).toMatchObject({
      metroId: "johannesburg",
    });
    expect(
      getTownshipAreaDefinition("Stretford Ext 2", "760001001"),
    ).toMatchObject({ metroId: "emfuleni" });
    expect(getTownshipAreaDefinition("Some Other Place")).toBeUndefined();
    expect(getTownshipAreaDefinition("Some Other Place")).toBeUndefined();
  });

  it("ignores an excluded sub-place name even when it starts with the area name", () => {
    expect(
      getTownshipAreaDefinition("Ekandustria", "799055007"),
    ).toBeUndefined();
  });
});
