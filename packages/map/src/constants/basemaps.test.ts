import { afterEach, describe, expect, it } from "vitest";
import {
  getBasemapDefinition,
  getBasemapTileSources,
  getRegisteredBasemapIds,
  type RasterBasemapDefinition,
  registerBasemap,
  resetBasemapRegistry,
  resolveTileScaleToken,
  type VectorBasemapDefinition,
} from "./basemaps";

const CUSTOM_RASTER_BASEMAP: RasterBasemapDefinition = {
  kind: "raster",
  label: "Custom",
  description: "A custom basemap.",
  url: "https://example.com/{z}/{x}/{y}.png",
  attribution: "Example",
};

const CUSTOM_VECTOR_BASEMAP: VectorBasemapDefinition = {
  kind: "vector",
  label: "Custom Vector",
  description: "A custom vector basemap.",
  styleUrl: "https://example.com/style.json",
};

describe("basemap registry", () => {
  afterEach(() => {
    resetBasemapRegistry();
  });

  it("includes the built-in street, satellite, voyager, and topo basemaps by default", () => {
    expect(getRegisteredBasemapIds()).toEqual([
      "street",
      "satellite",
      "voyager",
      "topo",
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
      "topo",
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

  it.each([
    ["satellite", /arcgisonline/],
    ["topo", /World_Topo_Map/],
  ])(
    "returns a single %s source regardless of dark mode",
    (basemap, urlPattern) => {
      expect(getBasemapTileSources(basemap, false)).toHaveLength(1);
      expect(getBasemapTileSources(basemap, true)).toHaveLength(1);
      expect(getBasemapTileSources(basemap, true)[0]?.url).toMatch(urlPattern);
    },
  );

  it("returns the CARTO Voyager source with an OpenStreetMap fallback", () => {
    const sources = getBasemapTileSources("voyager", false);

    expect(sources[0]?.url).toMatch(/rastertiles\/voyager/);
    expect(sources.at(-1)?.url).toMatch(/tile\.openstreetmap\.org/);
  });

  it("returns a single source for a raster basemap with no dark or fallback URLs", () => {
    registerBasemap("custom", CUSTOM_RASTER_BASEMAP);

    expect(getBasemapTileSources("custom", false)).toEqual([
      { url: "https://example.com/{z}/{x}/{y}.png", attribution: "Example" },
    ]);
  });

  it("throws for a vector basemap", () => {
    registerBasemap("custom-vector", CUSTOM_VECTOR_BASEMAP);

    expect(() => getBasemapTileSources("custom-vector", false)).toThrow(
      /raster/i,
    );
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

describe("resolveTileScaleToken", () => {
  it("substitutes every {r} placeholder with @2x when retina tiles are wanted", () => {
    expect(
      resolveTileScaleToken(
        "https://{s}.example.com/{z}/{x}/{y}{r}.png?fallback={r}",
        true,
      ),
    ).toBe("https://{s}.example.com/{z}/{x}/{y}@2x.png?fallback=@2x");
  });

  it("strips every {r} placeholder when retina tiles are not wanted", () => {
    expect(
      resolveTileScaleToken(
        "https://{s}.example.com/{z}/{x}/{y}{r}.png",
        false,
      ),
    ).toBe("https://{s}.example.com/{z}/{x}/{y}.png");
  });

  it("leaves a URL without the placeholder untouched", () => {
    const url =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    expect(resolveTileScaleToken(url, true)).toBe(url);
    expect(resolveTileScaleToken(url, false)).toBe(url);
  });
});
