import { describe, expect, it } from "vitest";
import {
  filterFeaturesByMunicipality,
  normalizeBoundaries,
} from "./boundaries";

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
