import { describe, expect, it } from "vitest";
import { METROS, getMetroDefinition } from "./metros";

describe("metros", () => {
  it("defines Tshwane and Johannesburg with distinct municipality codes", () => {
    expect(METROS).toHaveLength(2);
    expect(getMetroDefinition("tshwane").municipalityCode).toBe(799);
    expect(getMetroDefinition("johannesburg").municipalityCode).toBe(798);
  });

  it("throws for an unknown metro id", () => {
    // @ts-expect-error deliberately invalid id for the runtime guard
    expect(() => getMetroDefinition("durban")).toThrow(/Unknown metro id/);
  });
});
