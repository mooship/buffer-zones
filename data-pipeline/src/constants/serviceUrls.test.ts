import { afterEach, describe, expect, it } from "vitest";
import { getOsrmBaseUrl, getOverpassUrls } from "./serviceUrls";

describe("serviceUrls", () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, "OSRM_BASE_URL");
    Reflect.deleteProperty(process.env, "OVERPASS_URL");
    Reflect.deleteProperty(process.env, "OVERPASS_URLS");
  });

  it("defaults to the public OSRM demo server", () => {
    expect(getOsrmBaseUrl()).toBe("https://router.project-osrm.org");
  });

  it("uses OSRM_BASE_URL when set, e.g. for a local instance", () => {
    process.env.OSRM_BASE_URL = "http://localhost:5000";
    expect(getOsrmBaseUrl()).toBe("http://localhost:5000");
  });

  it("defaults to multiple public Overpass mirrors", () => {
    const urls = getOverpassUrls();
    expect(urls.length).toBeGreaterThan(1);
    expect(urls[0]).toBe(
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    );
    expect(urls[1]).toBe("https://overpass.private.coffee/api/interpreter");
    expect(urls).toContain("https://overpass-api.de/api/interpreter");
    expect(urls[2]).toBe("https://overpass-api.de/api/interpreter");
  });

  it("uses only OVERPASS_URL when set, e.g. for a local instance", () => {
    process.env.OVERPASS_URL = "http://localhost:12345/api/interpreter";
    expect(getOverpassUrls()).toEqual([
      "http://localhost:12345/api/interpreter",
    ]);
  });

  it("uses OVERPASS_URLS priority list when set", () => {
    process.env.OVERPASS_URLS =
      "https://a.example/api/interpreter, https://b.example/api/interpreter";
    expect(getOverpassUrls()).toEqual([
      "https://a.example/api/interpreter",
      "https://b.example/api/interpreter",
    ]);
  });

  it("falls back to the public mirrors when OVERPASS_URLS is empty/whitespace-only", () => {
    process.env.OVERPASS_URLS = " , ,";
    expect(getOverpassUrls()).toEqual([
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter",
    ]);
  });
});
