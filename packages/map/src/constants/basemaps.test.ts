import { afterEach, describe, expect, it } from "vitest";
import {
  getBasemapDefinition,
  getBasemapTileSources,
  getRegisteredBasemapIds,
  type RasterBasemapDefinition,
  registerBasemap,
  resetBasemapRegistry,
} from "./basemaps";

const CUSTOM_RASTER_BASEMAP: RasterBasemapDefinition = {
  kind: "raster",
  label: "Custom",
  description: "A custom basemap.",
  url: "https://example.com/{z}/{x}/{y}.png",
  attribution: "Example",
};

describe("basemap registry", () => {
  afterEach(() => {
    resetBasemapRegistry();
  });

  it("includes the built-in street, satellite, and voyager basemaps by default", () => {
    expect(getRegisteredBasemapIds()).toEqual([
      "street",
      "satellite",
      "voyager",
    ]);
  });

  it("throws when looking up an unregistered basemap", () => {
    expect(() => getBasemapDefinition("unknown")).toThrow(/unknown/i);
  });

  it("registers a new basemap that becomes retrievable and listed", () => {
    registerBasemap("custom", CUSTOM_RASTER_BASEMAP);

    expect(getRegisteredBasemapIds()).toContain("custom");
    expect(getBasemapDefinition("custom")).toMatchObject({ label: "Custom" });
  });

  it("overwrites an existing basemap when registered again under the same id", () => {
    registerBasemap("street", {
      kind: "raster",
      label: "Replaced",
      description: "Replaced street basemap.",
      url: "https://example.com/{z}/{x}/{y}.png",
      attribution: "Example",
    });

    expect(getBasemapDefinition("street").label).toBe("Replaced");
  });

  it("resetBasemapRegistry restores the built-in defaults", () => {
    registerBasemap("custom", CUSTOM_RASTER_BASEMAP);

    resetBasemapRegistry();

    expect(getRegisteredBasemapIds()).toEqual([
      "street",
      "satellite",
      "voyager",
    ]);
  });
});

describe("getBasemapTileSources", () => {
  afterEach(() => {
    resetBasemapRegistry();
  });

  it("returns the light street source with an OpenStreetMap fallback", () => {
    const sources = getBasemapTileSources("street", false);

    expect(sources[0]?.url).toMatch(/light_all/);
    expect(sources.at(-1)?.url).toMatch(/tile\.openstreetmap\.org/);
  });

  it("returns the dark street source falling back through light then OpenStreetMap", () => {
    const sources = getBasemapTileSources("street", true);

    expect(sources[0]?.url).toMatch(/dark_all/);
    expect(sources[1]?.url).toMatch(/light_all/);
    expect(sources[2]?.url).toMatch(/tile\.openstreetmap\.org/);
  });

  it("returns a single satellite source regardless of dark mode", () => {
    expect(getBasemapTileSources("satellite", false)).toHaveLength(1);
    expect(getBasemapTileSources("satellite", true)).toHaveLength(1);
    expect(getBasemapTileSources("satellite", true)[0]?.url).toMatch(
      /arcgisonline/,
    );
  });

  it("returns a single source for a raster basemap with no dark or fallback URLs", () => {
    registerBasemap("custom", CUSTOM_RASTER_BASEMAP);

    expect(getBasemapTileSources("custom", false)).toEqual([
      { url: "https://example.com/{z}/{x}/{y}.png", attribution: "Example" },
    ]);
  });

  it("throws for a vector basemap", () => {
    expect(() => getBasemapTileSources("voyager", false)).toThrow(/raster/i);
  });

  it("falls back to the light attribution when a custom basemap has a darkUrl but no darkAttribution", () => {
    registerBasemap("custom-dark", {
      kind: "raster",
      label: "Custom Dark",
      description: "A custom basemap with a dark variant but no dark credit.",
      url: "https://example.com/{z}/{x}/{y}.png",
      attribution: "Example",
      darkUrl: "https://example.com/dark/{z}/{x}/{y}.png",
    });

    const [source] = getBasemapTileSources("custom-dark", true);

    expect(source).toEqual({
      url: "https://example.com/dark/{z}/{x}/{y}.png",
      attribution: "Example",
    });
  });
});
