import { describe, expect, it } from "vitest";
import type { OverpassResponse } from "./gautrain";
import {
  normalizeRelationTransitOverpass,
  normalizeWayNodeTransitOverpass,
} from "./overpassNormalizers";

describe("normalizeRelationTransitOverpass", () => {
  it("falls back to the ref tag when the name tag is absent", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation",
          id: 1,
          tags: { ref: "T1" },
          members: [
            {
              type: "way",
              ref: 100,
              geometry: [
                { lat: -26.257, lon: 27.9 },
                { lat: -26.204, lon: 28.047 },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeRelationTransitOverpass(raw, "Rea Vaya");

    expect(result.features[0]?.properties.name).toBe("T1");
  });

  it("skips elements that are not relations", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "way",
          id: 100,
          tags: {},
          geometry: [
            { lat: -26.257, lon: 27.9 },
            { lat: -26.204, lon: 28.047 },
          ],
        },
      ],
    };

    const result = normalizeRelationTransitOverpass(raw, "Rea Vaya");

    expect(result.features).toHaveLength(0);
  });

  it("falls back to 'Unnamed' when neither name nor ref tags are present", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation",
          id: 2,
          tags: {},
          members: [
            {
              type: "way",
              ref: 200,
              geometry: [
                { lat: -26.257, lon: 27.9 },
                { lat: -26.204, lon: 28.047 },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeRelationTransitOverpass(raw, "Rea Vaya");

    expect(result.features[0]?.properties.name).toBe("Unnamed");
  });
});

describe("normalizeWayNodeTransitOverpass", () => {
  it("normalizes a way element into a LineString feature", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "way",
          id: 100,
          tags: { name: "Main Line" },
          geometry: [
            { lat: -26.257, lon: 27.9 },
            { lat: -26.204, lon: 28.047 },
          ],
        },
      ],
    };

    const result = normalizeWayNodeTransitOverpass(raw, "PRASA");

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "way/100",
      name: "Main Line",
      network: "PRASA",
    });
    expect(result.features[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [27.9, -26.257],
        [28.047, -26.204],
      ],
    });
  });

  it("normalizes a node element into a Point feature", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "node",
          id: 200,
          tags: { name: "Central Station" },
          lat: -26.2,
          lon: 28.05,
        },
      ],
    };

    const result = normalizeWayNodeTransitOverpass(raw, "PRASA");

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [28.05, -26.2],
    });
  });

  it("falls back to 'Unnamed' when the name tag is absent", () => {
    const raw: OverpassResponse = {
      elements: [{ type: "node", id: 201, tags: {}, lat: -26.2, lon: 28.05 }],
    };

    const result = normalizeWayNodeTransitOverpass(raw, "PRASA");

    expect(result.features[0]?.properties.name).toBe("Unnamed");
  });

  it("skips relation elements", () => {
    const raw: OverpassResponse = {
      elements: [{ type: "relation", id: 1, tags: {}, members: [] }],
    };

    const result = normalizeWayNodeTransitOverpass(raw, "PRASA");

    expect(result.features).toHaveLength(0);
  });
});
