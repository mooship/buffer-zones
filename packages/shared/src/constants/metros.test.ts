import { describe, expect, it } from "vitest";
import { METROS, getMetroDefinition } from "./metros";

describe("metros", () => {
  it("defines all Gauteng municipalities with stable Census 2011 municipality codes", () => {
    expect(METROS).toHaveLength(9);
    expect(getMetroDefinition("tshwane").municipalityCodes).toEqual([799]);
    expect(getMetroDefinition("johannesburg").municipalityCodes).toEqual([798]);
    expect(getMetroDefinition("ekurhuleni").municipalityCodes).toEqual([797]);
    expect(getMetroDefinition("emfuleni").municipalityCodes).toEqual([760]);
    expect(getMetroDefinition("midvaal").municipalityCodes).toEqual([761]);
    expect(getMetroDefinition("lesedi").municipalityCodes).toEqual([762]);
    expect(getMetroDefinition("mogale-city").municipalityCodes).toEqual([763]);
    expect(getMetroDefinition("rand-west-city").municipalityCodes).toEqual([
      764, 765,
    ]);
    expect(getMetroDefinition("merafong-city").municipalityCodes).toEqual([
      766,
    ]);
  });

  it("throws for an unknown metro id", () => {
    // @ts-expect-error deliberately invalid id for the runtime guard
    expect(() => getMetroDefinition("durban")).toThrow(/Unknown metro id/);
  });
});
