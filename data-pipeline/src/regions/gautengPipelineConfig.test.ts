import type { TransitLayerFeatureCollection, TransitStop } from "@karta/app";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { statMock, readFileMock } = vi.hoisted(() => ({
  statMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  stat: statMock,
  readFile: readFileMock,
}));

const {
  fetchAReYengRoutesMock,
  normalizeAReYengMock,
  normalizeAReYengOverpassMock,
} = vi.hoisted(() => ({
  fetchAReYengRoutesMock: vi.fn(),
  normalizeAReYengMock: vi.fn(),
  normalizeAReYengOverpassMock: vi.fn(),
}));
vi.mock("../adapters/aReYeng", () => ({
  fetchAReYengRoutes: fetchAReYengRoutesMock,
  normalizeAReYeng: normalizeAReYengMock,
  normalizeAReYengOverpass: normalizeAReYengOverpassMock,
}));

const { fetchEkurhuleniIrptnRoutesMock, normalizeEkurhuleniIrptnMock } =
  vi.hoisted(() => ({
    fetchEkurhuleniIrptnRoutesMock: vi.fn(),
    normalizeEkurhuleniIrptnMock: vi.fn(),
  }));
vi.mock("../adapters/ekurhuleniIrptn", () => ({
  fetchEkurhuleniIrptnRoutes: fetchEkurhuleniIrptnRoutesMock,
  normalizeEkurhuleniIrptn: normalizeEkurhuleniIrptnMock,
}));

const {
  fetchGautrainBusRoutesMock,
  fetchGautrainRailMock,
  normalizeGautrainBusOverpassMock,
  normalizeGautrainOverpassMock,
} = vi.hoisted(() => ({
  fetchGautrainBusRoutesMock: vi.fn(),
  fetchGautrainRailMock: vi.fn(),
  normalizeGautrainBusOverpassMock: vi.fn(),
  normalizeGautrainOverpassMock: vi.fn(),
}));
vi.mock("../adapters/gautrain", () => ({
  fetchGautrainBusRoutes: fetchGautrainBusRoutesMock,
  fetchGautrainRail: fetchGautrainRailMock,
  normalizeGautrainBusOverpass: normalizeGautrainBusOverpassMock,
  normalizeGautrainOverpass: normalizeGautrainOverpassMock,
}));

const { fetchPrasaRailMock, normalizePrasaOverpassMock } = vi.hoisted(() => ({
  fetchPrasaRailMock: vi.fn(),
  normalizePrasaOverpassMock: vi.fn(),
}));
vi.mock("../adapters/prasa", () => ({
  fetchPrasaRail: fetchPrasaRailMock,
  normalizePrasaOverpass: normalizePrasaOverpassMock,
}));

const { fetchReaVayaRoutesMock, normalizeReaVayaOverpassMock } = vi.hoisted(
  () => ({
    fetchReaVayaRoutesMock: vi.fn(),
    normalizeReaVayaOverpassMock: vi.fn(),
  }),
);
vi.mock("../adapters/reaVaya", () => ({
  fetchReaVayaRoutes: fetchReaVayaRoutesMock,
  normalizeReaVayaOverpass: normalizeReaVayaOverpassMock,
}));

const { fetchTshwaneBusRoutesMock, normalizeTshwaneBusOverpassMock } =
  vi.hoisted(() => ({
    fetchTshwaneBusRoutesMock: vi.fn(),
    normalizeTshwaneBusOverpassMock: vi.fn(),
  }));
vi.mock("../adapters/tshwaneBus", () => ({
  fetchTshwaneBusRoutes: fetchTshwaneBusRoutesMock,
  normalizeTshwaneBusOverpass: normalizeTshwaneBusOverpassMock,
}));

const { GAUTENG_PIPELINE_CONFIG } = await import("./gautengPipelineConfig");

function networksOf(collection: {
  features: readonly { properties: unknown }[];
}): string[] {
  return collection.features.map(
    (feature) => (feature.properties as TransitStop).network,
  );
}

function findSource(layerId: string) {
  const source = GAUTENG_PIPELINE_CONFIG.sources.find(
    (s) => s.layerId === layerId,
  );
  if (!source) {
    throw new Error(`No source registered for layerId ${layerId}`);
  }
  return source;
}

function transitLine(
  network: string,
  id = "way/1",
): TransitLayerFeatureCollection {
  const stop: TransitStop = { id, name: "Test line", network };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: stop,
        geometry: {
          type: "LineString",
          coordinates: [
            [28, -26],
            [28.1, -26.1],
          ],
        },
      },
    ],
  };
}

describe("GAUTENG_PIPELINE_CONFIG", () => {
  it("has one source per current output transit layer", () => {
    expect(GAUTENG_PIPELINE_CONFIG.regionId).toBe("gauteng");
    expect(
      GAUTENG_PIPELINE_CONFIG.sources.map((s) => s.layerId).sort(),
    ).toEqual(["bus", "bus-rapid-transit", "commuter-rail", "rapid-rail"]);
  });

  it("maps each source to the same output filename run.ts writes today", () => {
    const byLayerId = Object.fromEntries(
      GAUTENG_PIPELINE_CONFIG.sources.map((s) => [s.layerId, s.outputFileName]),
    );
    expect(byLayerId["rapid-rail"]).toBe("rapid-rail.display.v1.geojson");
    expect(byLayerId["commuter-rail"]).toBe("commuter-rail.display.v1.geojson");
    expect(byLayerId["bus-rapid-transit"]).toBe(
      "bus-rapid-transit.display.v1.geojson",
    );
    expect(byLayerId.bus).toBe("bus.display.v1.geojson");
  });

  it("includes all 9 Gauteng metros", () => {
    expect(GAUTENG_PIPELINE_CONFIG.metros).toHaveLength(9);
  });

  it("tags every source with the gauteng region id", () => {
    for (const source of GAUTENG_PIPELINE_CONFIG.sources) {
      expect(source.regionId).toBe("gauteng");
    }
  });
});

describe("fetchRapidRail (rapid-rail source)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes a successful Gautrain rail fetch", async () => {
    fetchGautrainRailMock.mockResolvedValue({ elements: [] });
    const normalized = transitLine("Gautrain");
    normalizeGautrainOverpassMock.mockReturnValue(normalized);

    const result = await findSource("rapid-rail").fetch();

    expect(result).toBe(normalized);
  });

  it("falls back to the last published output when the fetch fails", async () => {
    fetchGautrainRailMock.mockRejectedValue(new Error("network down"));
    statMock.mockResolvedValueOnce(undefined);
    const fallback = transitLine("Gautrain");
    readFileMock.mockResolvedValueOnce(JSON.stringify(fallback));

    const result = await findSource("rapid-rail").fetch();

    expect(result).toEqual(fallback);
  });

  it("throws when the fetch fails and no fallback output exists", async () => {
    fetchGautrainRailMock.mockRejectedValue(new Error("network down"));
    statMock.mockRejectedValue(new Error("ENOENT"));

    await expect(findSource("rapid-rail").fetch()).rejects.toThrow(
      "Failed to fetch Gautrain rail and no fallback output exists",
    );
  });
});

describe("fetchCommuterRail (commuter-rail source)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes a successful PRASA rail fetch", async () => {
    fetchPrasaRailMock.mockResolvedValue({ elements: [] });
    const normalized = transitLine("Metrorail Gauteng");
    normalizePrasaOverpassMock.mockReturnValue(normalized);

    const result = await findSource("commuter-rail").fetch();

    expect(result).toBe(normalized);
  });

  it("falls back to the last published output when the fetch fails", async () => {
    fetchPrasaRailMock.mockRejectedValue(new Error("network down"));
    statMock.mockResolvedValueOnce(undefined);
    const fallback = transitLine("Metrorail Gauteng");
    readFileMock.mockResolvedValueOnce(JSON.stringify(fallback));

    const result = await findSource("commuter-rail").fetch();

    expect(result).toEqual(fallback);
  });

  it("throws when the fetch fails and no fallback output exists", async () => {
    fetchPrasaRailMock.mockRejectedValue(new Error("network down"));
    statMock.mockRejectedValue(new Error("ENOENT"));

    await expect(findSource("commuter-rail").fetch()).rejects.toThrow(
      "Failed to fetch PRASA rail and no fallback output exists",
    );
  });
});

describe("fetchBusRapidTransit (bus-rapid-transit source)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchReaVayaRoutesMock.mockResolvedValue({ elements: [] });
    normalizeReaVayaOverpassMock.mockReturnValue(transitLine("Rea Vaya"));
    fetchEkurhuleniIrptnRoutesMock.mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
    normalizeEkurhuleniIrptnMock.mockReturnValue(
      transitLine("Ekurhuleni IRPTN"),
    );
  });

  it("normalizes A Re Yeng via the Overpass path when the response has elements", async () => {
    fetchAReYengRoutesMock.mockResolvedValue({ elements: [] });
    normalizeAReYengOverpassMock.mockReturnValue(transitLine("A Re Yeng"));

    await findSource("bus-rapid-transit").fetch();

    expect(normalizeAReYengOverpassMock).toHaveBeenCalledTimes(1);
    expect(normalizeAReYengMock).not.toHaveBeenCalled();
  });

  it("normalizes A Re Yeng via the portal path when the response has no elements", async () => {
    fetchAReYengRoutesMock.mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
    normalizeAReYengMock.mockReturnValue(transitLine("A Re Yeng"));

    await findSource("bus-rapid-transit").fetch();

    expect(normalizeAReYengMock).toHaveBeenCalledTimes(1);
    expect(normalizeAReYengOverpassMock).not.toHaveBeenCalled();
  });

  it("merges A Re Yeng, Rea Vaya and Ekurhuleni IRPTN features", async () => {
    fetchAReYengRoutesMock.mockResolvedValue({ elements: [] });
    normalizeAReYengOverpassMock.mockReturnValue(
      transitLine("A Re Yeng", "areyeng/1"),
    );

    const result = await findSource("bus-rapid-transit").fetch();

    expect(networksOf(result).sort()).toEqual(
      ["A Re Yeng", "Ekurhuleni IRPTN", "Rea Vaya"].sort(),
    );
  });
});

describe("fetchBus (bus source, wraps fetchGautrainBus)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTshwaneBusRoutesMock.mockResolvedValue({ elements: [] });
    normalizeTshwaneBusOverpassMock.mockReturnValue(
      transitLine("Tshwane Bus Services"),
    );
  });

  it("merges a successful Gautrain Bus fetch with Tshwane Bus", async () => {
    fetchGautrainBusRoutesMock.mockResolvedValue({ elements: [] });
    normalizeGautrainBusOverpassMock.mockReturnValue(
      transitLine("Gautrain Bus"),
    );

    const result = await findSource("bus").fetch();

    expect(networksOf(result).sort()).toEqual(
      ["Gautrain Bus", "Tshwane Bus Services"].sort(),
    );
  });

  it("recovers only the Gautrain Bus features from a mixed fallback file", async () => {
    fetchGautrainBusRoutesMock.mockRejectedValue(new Error("network down"));
    statMock.mockResolvedValueOnce(undefined);
    const mixedFallback: TransitLayerFeatureCollection = {
      type: "FeatureCollection",
      features: [
        ...transitLine("Gautrain Bus", "gb/1").features,
        ...transitLine("Tshwane Bus Services", "tb/1").features,
      ],
    };
    readFileMock.mockResolvedValueOnce(JSON.stringify(mixedFallback));

    const result = await findSource("bus").fetch();

    expect(networksOf(result)).toEqual([
      "Gautrain Bus",
      "Tshwane Bus Services",
    ]);
  });

  it("throws when the fallback file has no Gautrain Bus features", async () => {
    fetchGautrainBusRoutesMock.mockRejectedValue(new Error("network down"));
    statMock.mockResolvedValueOnce(undefined);
    readFileMock.mockResolvedValueOnce(
      JSON.stringify(transitLine("Tshwane Bus Services", "tb/1")),
    );

    await expect(findSource("bus").fetch()).rejects.toThrow(
      "Failed to recover Gautrain Bus from fallback output",
    );
  });

  it("throws when the fetch fails and no fallback output exists", async () => {
    fetchGautrainBusRoutesMock.mockRejectedValue(new Error("network down"));
    statMock.mockRejectedValue(new Error("ENOENT"));

    await expect(findSource("bus").fetch()).rejects.toThrow(
      "Failed to fetch Gautrain Bus and no fallback output exists",
    );
  });
});

describe("readExistingTransitLayer fallback file resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchGautrainRailMock.mockRejectedValue(new Error("network down"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the plain .v1.geojson file when the .display.v1 file is missing", async () => {
    statMock
      .mockRejectedValueOnce(new Error("ENOENT")) // .display.v1.geojson candidate
      .mockResolvedValueOnce(undefined); // .v1.geojson candidate
    const fallback = transitLine("Gautrain");
    readFileMock.mockResolvedValueOnce(JSON.stringify(fallback));

    const result = await findSource("rapid-rail").fetch();

    expect(result).toEqual(fallback);
  });

  it("skips a candidate with corrupt JSON, warning about it, and falls through to no-fallback", async () => {
    statMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue("{not json");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(findSource("rapid-rail").fetch()).rejects.toThrow(
      "Failed to fetch Gautrain rail and no fallback output exists",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read fallback candidate"),
      expect.any(String),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("skips a candidate whose parsed content has no features and falls through", async () => {
    statMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(
      JSON.stringify({ type: "FeatureCollection", features: [] }),
    );

    await expect(findSource("rapid-rail").fetch()).rejects.toThrow(
      "Failed to fetch Gautrain rail and no fallback output exists",
    );
  });
});
