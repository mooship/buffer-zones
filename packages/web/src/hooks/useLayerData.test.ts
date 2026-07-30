import type { LayerId } from "@buffer-zones/shared";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLayerData } from "./useLayerData";

global.fetch = vi.fn();

describe("useLayerData", () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches layers when mounted", async () => {
    const { result } = renderHook(() => useLayerData(["townships" as LayerId]));

    await waitFor(() => {
      expect(result.current).toHaveProperty("townships");
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/national/townships.display.v1.geojson"),
    );
  });

  it("adds newly requested layers without refetching existing ones", async () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: LayerId[] }) => useLayerData(ids),
      { initialProps: { ids: ["townships" as LayerId] } },
    );

    await waitFor(() => {
      expect(result.current).toHaveProperty("townships");
    });
    vi.clearAllMocks();

    rerender({ ids: ["townships", "rapid-rail"] as LayerId[] });

    await waitFor(() => {
      expect(result.current).toHaveProperty("rapid-rail");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/national/rapid-rail.display.v1.geojson"),
    );
  });

  it("does not fetch layers that are unavailable", async () => {
    const { result } = renderHook(() => useLayerData(["myciti" as LayerId]));

    await waitFor(() => {
      expect(result.current).toEqual({});
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retries a failed fetch after a layer is toggled off and on again", async () => {
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: [] }),
      } as Response);

    const { result, rerender } = renderHook(
      ({ ids }: { ids: LayerId[] }) => useLayerData(ids),
      { initialProps: { ids: ["rapid-rail" as LayerId] } },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toEqual({});

    rerender({ ids: [] });
    rerender({ ids: ["rapid-rail" as LayerId] });

    await waitFor(() => {
      expect(result.current).toHaveProperty("rapid-rail");
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
