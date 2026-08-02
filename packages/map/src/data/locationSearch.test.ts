import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLocationSearchResults,
  fetchReverseGeocodeResult,
  nominatimGeocoderProvider,
} from "./locationSearch";

describe("fetchLocationSearchResults", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty array without fetching for a blank query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const results = await fetchLocationSearchResults("   ");

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Nominatim results and parses the bounding box", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 123,
            display_name: "Soweto, Johannesburg, Gauteng, South Africa",
            lat: "-26.267",
            lon: "27.854",
            boundingbox: ["-26.3", "-26.2", "27.8", "27.9"],
          },
        ],
      }),
    );

    const results = await fetchLocationSearchResults("Soweto");

    expect(results).toEqual([
      {
        id: "123",
        label: "Soweto, Johannesburg, Gauteng, South Africa",
        latitude: -26.267,
        longitude: 27.854,
        bounds: [
          [-26.3, 27.8],
          [-26.2, 27.9],
        ],
      },
    ]);
  });

  it("throws with the HTTP status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchLocationSearchResults("Soweto")).rejects.toThrow(/503/);
  });
});

describe("fetchReverseGeocodeResult", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves a place from its coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        place_id: 456,
        display_name: "Braamfontein, Johannesburg, Gauteng, South Africa",
        lat: "-26.19",
        lon: "28.03",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchReverseGeocodeResult(-26.19, 28.03);

    expect(result).toEqual({
      id: "456",
      label: "Braamfontein, Johannesburg, Gauteng, South Africa",
      latitude: -26.19,
      longitude: 28.03,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/reverse"),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain("lat=-26.19");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("lon=28.03");
  });

  it("returns null when Nominatim can't geocode the coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Unable to geocode" }),
      }),
    );

    const result = await fetchReverseGeocodeResult(0, 0);

    expect(result).toBeNull();
  });

  it("throws with the HTTP status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(fetchReverseGeocodeResult(-26.19, 28.03)).rejects.toThrow(
      /500/,
    );
  });
});

describe("nominatimGeocoderProvider", () => {
  it("delegates search and reverse to the corresponding functions", () => {
    expect(nominatimGeocoderProvider.search).toBe(fetchLocationSearchResults);
    expect(nominatimGeocoderProvider.reverse).toBe(fetchReverseGeocodeResult);
  });
});
