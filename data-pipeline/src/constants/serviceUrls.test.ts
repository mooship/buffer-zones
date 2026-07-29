import { afterEach, describe, expect, it } from "vitest";
import { getOsrmBaseUrl, getOverpassUrls } from "./serviceUrls";

describe("serviceUrls", () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, "OSRM_BASE_URL");
    Reflect.deleteProperty(process.env, "OVERPASS_URL");
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
    expect(urls).toContain("https://overpass-api.de/api/interpreter");
  });

  it("uses only OVERPASS_URL when set, e.g. for a local instance", () => {
    process.env.OVERPASS_URL = "http://localhost:12345/api/interpreter";
    expect(getOverpassUrls()).toEqual([
      "http://localhost:12345/api/interpreter",
    ]);
  });
});
