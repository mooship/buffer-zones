import { describe, expect, it } from "vitest";
import { METROS, getMetroDefinition } from "./metros";

describe("metros", () => {
  it("defines Gauteng metros with distinct municipality codes", () => {
    expect(METROS).toHaveLength(3);
    expect(getMetroDefinition("tshwane").municipalityCode).toBe(799);
    expect(getMetroDefinition("johannesburg").municipalityCode).toBe(798);
    expect(getMetroDefinition("ekurhuleni").municipalityCode).toBe(797);
  });

  it("throws for an unknown metro id", () => {
    // @ts-expect-error deliberately invalid id for the runtime guard
    expect(() => getMetroDefinition("durban")).toThrow(/Unknown metro id/);
  });
});
