import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import type { DomainConfig } from "@stratum/core";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainProvider } from "../context/DomainContext";
import { useLayerData } from "./useLayerData";

global.fetch = vi.fn();

function withGautengDomain({ children }: { children: React.ReactNode }) {
  return (
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
      {children}
    </DomainProvider>
  );
}

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
    const { result } = renderHook(() => useLayerData(["rapid-rail"]), {
      wrapper: withGautengDomain,
    });

    await waitFor(() => {
      expect(result.current.data).toHaveProperty("rapid-rail");
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/gauteng/rapid-rail.display.v1.geojson"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("adds newly requested layers without refetching existing ones", async () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useLayerData(ids),
      { initialProps: { ids: ["rapid-rail"] }, wrapper: withGautengDomain },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveProperty("rapid-rail");
    });
    vi.clearAllMocks();

    rerender({ ids: ["rapid-rail", "bus"] });

    await waitFor(() => {
      expect(result.current.data).toHaveProperty("bus");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/gauteng/bus.display.v1.geojson"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not fetch layers that are unavailable", async () => {
    const { result } = renderHook(() => useLayerData(["myciti"]), {
      wrapper: withGautengDomain,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({});
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
      ({ ids }: { ids: string[] }) => useLayerData(ids),
      { initialProps: { ids: ["rapid-rail"] }, wrapper: withGautengDomain },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(result.current.data).toEqual({});
    await waitFor(() => {
      expect(result.current.failedLayerIds).toEqual(["rapid-rail"]);
    });

    rerender({ ids: [] });
    rerender({ ids: ["rapid-rail"] });

    await waitFor(() => {
      expect(result.current.data).toHaveProperty("rapid-rail");
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.failedLayerIds).toEqual([]);
  });

  it("logs a failed layer fetch to the console", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchError = new Error("network");
    vi.mocked(global.fetch).mockRejectedValueOnce(fetchError);

    const { result } = renderHook(() => useLayerData(["rapid-rail"]), {
      wrapper: withGautengDomain,
    });

    await waitFor(() => {
      expect(result.current.failedLayerIds).toEqual(["rapid-rail"]);
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("rapid-rail"),
      fetchError,
    );

    consoleError.mockRestore();
  });

  it("aborts in-flight fetches on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(global.fetch).mockImplementation((_, init) => {
      capturedSignal = (init as RequestInit | undefined)?.signal as
        | AbortSignal
        | undefined;
      return new Promise<Response>(() => {});
    });

    const { unmount } = renderHook(() => useLayerData(["rapid-rail"]), {
      wrapper: withGautengDomain,
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("merges features from every region source configured for a layer", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { region: "a" }, geometry: null },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { region: "b" }, geometry: null },
          ],
        }),
      } as Response);

    const twoSourceDomain: DomainConfig = {
      layers: [
        {
          id: "townships",
          label: "Modeled car time",
          dataSource: [
            "/data/gauteng/townships.display.v1.geojson",
            "/data/other/townships.display.v1.geojson",
          ],
          geometryKind: "choropleth",
          defaultVisible: true,
          available: true,
          style: {
            kind: "choropleth",
            propertyKey: "commuteMinutes",
            buckets: [],
            baseOpacity: 0.18,
          },
        },
      ],
      layerGroups: [],
    };

    const { result } = renderHook(() => useLayerData(["townships"]), {
      wrapper: ({ children }) => (
        <DomainProvider domain={twoSourceDomain}>{children}</DomainProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.data.townships?.features).toHaveLength(2);
    });
  });
});
