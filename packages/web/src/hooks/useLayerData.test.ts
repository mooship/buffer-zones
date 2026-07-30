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
});
