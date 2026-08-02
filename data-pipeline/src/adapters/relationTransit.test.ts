import { describe, expect, it } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizeRelationTransitOverpass } from "./relationTransit";

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
