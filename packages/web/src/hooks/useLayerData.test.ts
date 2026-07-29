import type { LayerId } from "@buffer-zones/shared";
import { renderHook, waitFor } from "@testing-library/react";
import type { FeatureCollection } from "geojson";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeatureCollection } from "../data/fetchFeatureCollection";
import { useLayerData } from "./useLayerData";

vi.mock("../data/fetchFeatureCollection", () => ({
  fetchFeatureCollection: vi.fn(),
}));

const fetchFeatureCollectionMock = vi.mocked(fetchFeatureCollection);

function emptyCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

describe("useLayerData", () => {
  afterEach(() => {
    fetchFeatureCollectionMock.mockReset();
  });

  it("does not refetch a layer id that already loaded successfully", async () => {
    fetchFeatureCollectionMock.mockResolvedValue(emptyCollection());

    const { result, rerender } = renderHook(
      (ids: LayerId[]) => useLayerData(ids, "tshwane"),
      { initialProps: ["townships"] },
    );

    await waitFor(() => {
      expect(result.current.townships).toBeDefined();
    });
    expect(fetchFeatureCollectionMock).toHaveBeenCalledTimes(1);

    rerender(["townships", "gautrain"]);

    await waitFor(() => {
      expect(result.current.gautrain).toBeDefined();
    });
    expect(fetchFeatureCollectionMock).toHaveBeenCalledTimes(2);
    expect(fetchFeatureCollectionMock).toHaveBeenCalledWith(
      "/data/tshwane/gautrain.display.v1.geojson",
    );
  });

  it("retries a layer id after a failed fetch once it is requested again", async () => {
    fetchFeatureCollectionMock.mockRejectedValueOnce(
      new Error("network error"),
    );

    const { result, rerender } = renderHook(
      (ids: LayerId[]) => useLayerData(ids, "tshwane"),
      { initialProps: ["townships"] },
    );

    await waitFor(() => {
      expect(fetchFeatureCollectionMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current.townships).toBeUndefined();

    fetchFeatureCollectionMock.mockResolvedValue(emptyCollection());
    rerender(["townships", "gautrain"]);

    await waitFor(() => {
      expect(result.current.townships).toBeDefined();
    });
    expect(fetchFeatureCollectionMock).toHaveBeenCalledTimes(3);
  });

  it("does not fetch a layer id that is marked unavailable", async () => {
    const { result } = renderHook(
      (ids: LayerId[]) => useLayerData(ids, "tshwane"),
      { initialProps: ["myciti"] },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchFeatureCollectionMock).not.toHaveBeenCalled();
    expect(result.current.myciti).toBeUndefined();
  });

  it("clears loaded data and refetches from the new metro's data source when the metro changes", async () => {
    fetchFeatureCollectionMock.mockResolvedValue(emptyCollection());

    const { result, rerender } = renderHook(
      ({
        ids,
        metroId,
      }: { ids: LayerId[]; metroId: "tshwane" | "johannesburg" }) =>
        useLayerData(ids, metroId),
      { initialProps: { ids: ["townships"] as LayerId[], metroId: "tshwane" } },
    );

    await waitFor(() => {
      expect(result.current.townships).toBeDefined();
    });
    expect(fetchFeatureCollectionMock).toHaveBeenCalledWith(
      "/data/tshwane/townships.display.v1.geojson",
    );

    rerender({ ids: ["townships"], metroId: "johannesburg" });

    await waitFor(() => {
      expect(result.current.townships).toBeDefined();
    });
    expect(fetchFeatureCollectionMock).toHaveBeenCalledWith(
      "/data/johannesburg/townships.display.v1.geojson",
    );
  });
});
