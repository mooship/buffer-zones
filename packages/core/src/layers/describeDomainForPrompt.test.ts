import { describe, expect, it } from "vitest";
import type { DomainConfig } from "../types/layer";
import { describeDomainForPrompt } from "./describeDomainForPrompt";

const DOMAIN: DomainConfig = {
  layers: [
    {
      id: "a",
      label: "Layer A",
      description: "Describes A.",
      dataSource: ["/a.geojson"],
      geometryKind: "choropleth",
      defaultVisible: true,
      available: true,
      style: {
        kind: "choropleth",
        propertyKey: "value",
        buckets: [],
        baseOpacity: 0.2,
      },
    },
    {
      id: "b",
      label: "Layer B",
      dataSource: ["/b.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#000", weight: 1, legendLabel: "B" },
    },
    {
      id: "c",
      label: "Layer C (unreleased)",
      dataSource: ["/c.geojson"],
      geometryKind: "point",
      defaultVisible: false,
      available: false,
      style: { kind: "point", color: "#000", radius: 1, legendLabel: "C" },
    },
  ],
  layerGroups: [
    {
      id: "group-1",
      title: "Group One",
      description: "Only one at a time.",
      selectionMode: "exclusive",
      layerIds: ["a", "b"],
    },
    {
      id: "group-2",
      title: "Group Two",
      selectionMode: "independent",
      layerIds: ["c"],
    },
  ],
};

describe("describeDomainForPrompt", () => {
  it("describes each available layer's label, geometry kind, and description", () => {
    const text = describeDomainForPrompt(DOMAIN);

    expect(text).toContain("- Layer A (choropleth) — Describes A.");
    expect(text).toContain("- Layer B (line)");
  });

  it("omits layers that aren't available", () => {
    const text = describeDomainForPrompt(DOMAIN);

    expect(text).not.toContain("Layer C");
  });

  it("describes each layer group's title, selection mode, description, and member labels", () => {
    const text = describeDomainForPrompt(DOMAIN);

    expect(text).toContain(
      "- Group One (exclusive) — Only one at a time.: Layer A, Layer B",
    );
  });

  it("omits an unavailable layer from its group's member labels", () => {
    const text = describeDomainForPrompt(DOMAIN);

    expect(text).toContain("- Group Two (independent): ");
    expect(text).not.toContain("Layer C (unreleased)");
  });
});
