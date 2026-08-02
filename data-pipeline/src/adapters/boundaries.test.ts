import AdmZip from "adm-zip";
import { afterEach, describe, expect, it, vi } from "vitest";

const shapefileReadMock = vi.hoisted(() => vi.fn());
vi.mock("shapefile", () => ({ read: shapefileReadMock }));

import {
  convertShapefileToGeoJSON,
  fetchMetroBoundaries,
  filterFeaturesByMunicipality,
  normalizeBoundaries,
} from "./boundaries";

afterEach(() => {
  vi.unstubAllGlobals();
  shapefileReadMock.mockReset();
});

describe("normalizeBoundaries", () => {
  it("maps raw sub-place properties to NormalizedTownship and computes a centroid", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: "799013001",
            SP_NAME: "Mamelodi SP",
            TotalPop: 334577,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28.4, -25.68],
                [28.42, -25.68],
                [28.42, -25.66],
                [28.4, -25.66],
                [28.4, -25.68],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    expect(result).toHaveLength(1);
    const [township] = result;
    expect(township).toMatchObject({
      id: "799013001",
      name: "Mamelodi SP",
      population: 334577,
    });
    expect(township?.centroid.lat).toBeCloseTo(-25.67, 1);
    expect(township?.centroid.lon).toBeCloseTo(28.41, 1);
  });

  it("omits population when the source field is missing", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { SP_CODE: "1", SP_NAME: "Unnamed" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28, -25.8],
                [28.1, -25.8],
                [28.1, -25.7],
                [28, -25.7],
                [28, -25.8],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    const [township] = result;
    expect(township?.population).toBeUndefined();
  });
});

describe("filterFeaturesByMunicipality", () => {
  it("keeps only City of Tshwane (MN_CODE 799) records and remaps their properties", () => {
    const nationalCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: 799016009,
            SP_NAME: "Odinburg Gardens",
            MN_CODE: 799,
            MN_NAME: "City of Tshwane",
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28.4, -25.68],
                [28.42, -25.68],
                [28.42, -25.66],
                [28.4, -25.66],
                [28.4, -25.68],
              ],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: 199041044,
            SP_NAME: "Oranjezicht",
            MN_CODE: 199,
            MN_NAME: "City of Cape Town",
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [18.4, -33.94],
                [18.42, -33.94],
                [18.42, -33.92],
                [18.4, -33.92],
                [18.4, -33.94],
              ],
            ],
          },
        },
      ],
    };

    const result = filterFeaturesByMunicipality(nationalCollection, [799]);

    expect(result.features).toHaveLength(1);
    const [feature] = result.features;
    expect(feature?.properties).toEqual({
      SP_CODE: "799016009",
      SP_NAME: "Odinburg Gardens",
    });
  });

  it("returns an empty feature list when no record matches the Tshwane municipality code", () => {
    const nationalCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: 199041044,
            SP_NAME: "Oranjezicht",
            MN_CODE: 199,
            MN_NAME: "City of Cape Town",
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [18.4, -33.94],
                [18.42, -33.94],
                [18.42, -33.92],
                [18.4, -33.92],
                [18.4, -33.94],
              ],
            ],
          },
        },
      ],
    };

    const result = filterFeaturesByMunicipality(nationalCollection, [799]);

    expect(result.features).toHaveLength(0);
  });

  it("supports merged municipalities by accepting multiple municipality codes", () => {
    const nationalCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: 764004001,
            SP_NAME: "Mohlakeng",
            MN_CODE: 764,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [27.66, -26.18],
                [27.67, -26.18],
                [27.67, -26.17],
                [27.66, -26.17],
                [27.66, -26.18],
              ],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: 765002001,
            SP_NAME: "Bekkersdal",
            MN_CODE: 765,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [27.62, -26.35],
                [27.63, -26.35],
                [27.63, -26.34],
                [27.62, -26.34],
                [27.62, -26.35],
              ],
            ],
          },
        },
      ],
    };

    const result = filterFeaturesByMunicipality(nationalCollection, [764, 765]);

    expect(result.features).toHaveLength(2);
    expect(result.features.map((feature) => feature.properties)).toEqual([
      {
        SP_CODE: "764004001",
        SP_NAME: "Mohlakeng",
      },
      {
        SP_CODE: "765002001",
        SP_NAME: "Bekkersdal",
      },
    ]);
  });
});

describe("convertShapefileToGeoJSON", () => {
  it("throws when the zip archive is missing the expected shapefile entries", async () => {
    const zip = new AdmZip();
    zip.addFile("Subplace/README.txt", Buffer.from("not a shapefile"));

    await expect(
      convertShapefileToGeoJSON(zip.toBuffer(), [799]),
    ).rejects.toThrow(
      "Expected Subplace/SP_SA_2011.shp and Subplace/SP_SA_2011.dbf entries in the boundary zip archive",
    );
  });

  it("parses the zip's shp/dbf entries and filters the result to the given municipality codes", async () => {
    const zip = new AdmZip();
    zip.addFile("Subplace/SP_SA_2011.shp", Buffer.from("shp bytes"));
    zip.addFile("Subplace/SP_SA_2011.dbf", Buffer.from("dbf bytes"));
    shapefileReadMock.mockResolvedValue({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            SP_CODE: 799016009,
            SP_NAME: "Odinburg Gardens",
            MN_CODE: 799,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
        {
          type: "Feature",
          properties: {
            SP_CODE: 199041044,
            SP_NAME: "Oranjezicht",
            MN_CODE: 199,
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
      ],
    });

    const result = await convertShapefileToGeoJSON(zip.toBuffer(), [799]);

    expect(shapefileReadMock).toHaveBeenCalledTimes(1);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      SP_CODE: "799016009",
      SP_NAME: "Odinburg Gardens",
    });
  });
});

describe("fetchMetroBoundaries", () => {
  it("throws when the boundary source download fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMetroBoundaries("tshwane")).rejects.toThrow(
      "Failed to fetch metro boundaries: 404",
    );
  });

  it("converts a successfully downloaded zip into GeoJSON for the metro's municipality codes", async () => {
    const zip = new AdmZip();
    zip.addFile("Subplace/README.txt", Buffer.from("not a shapefile"));
    const zipBuffer = zip.toBuffer();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        zipBuffer.buffer.slice(
          zipBuffer.byteOffset,
          zipBuffer.byteOffset + zipBuffer.byteLength,
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    // The downloaded fixture zip has no shapefile entries, so this proves
    // fetchMetroBoundaries actually reaches convertShapefileToGeoJSON with
    // the fetched bytes, without needing a real Subplace shapefile fixture.
    await expect(fetchMetroBoundaries("tshwane")).rejects.toThrow(
      "Expected Subplace/SP_SA_2011.shp and Subplace/SP_SA_2011.dbf entries in the boundary zip archive",
    );
  });
});
