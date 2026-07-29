import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNearestJobCenter } from "./osrmClient";

describe("getNearestJobCenter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const destinations = [
    { id: "pretoria-cbd", name: "Pretoria CBD", lat: -25.7461, lon: 28.1881 },
    { id: "menlyn", name: "Menlyn", lat: -25.7825, lon: 28.2775 },
  ];

  it("picks, per origin, the destination with the shortest duration and converts seconds to minutes", async () => {
    const origins = [
      { lat: -25.75, lon: 28.19 },
      { lat: -25.9, lon: 28.3 },
    ];
    // durations[originIndex][destinationIndex]: origin 0 is closer to Pretoria CBD (120s),
    // origin 1 is closer to Menlyn (300s vs 900s to CBD)
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        durations: [
          [120, 800],
          [900, 300],
        ],
      }),
    });

    const result = await getNearestJobCenter(origins, destinations);

    expect(result).toEqual([
      {
        minutes: 2,
        jobCenterId: "pretoria-cbd",
        jobCenterName: "Pretoria CBD",
      },
      { minutes: 5, jobCenterId: "menlyn", jobCenterName: "Menlyn" },
    ]);
  });

  it("returns a null result for an origin with no reachable destination", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ code: "Ok", durations: [[null, null]] }),
    });

    const result = await getNearestJobCenter(
      [{ lat: -25.75, lon: 28.19 }],
      destinations,
    );

    expect(result).toEqual([
      { minutes: null, jobCenterId: null, jobCenterName: null },
    ]);
  });

  it("retries once on HTTP 429 then succeeds", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", durations: [[600, 1200]] }),
      });

    const result = await getNearestJobCenter(
      [{ lat: -25.75, lon: 28.19 }],
      destinations,
    );

    expect(result).toEqual([
      {
        minutes: 10,
        jobCenterId: "pretoria-cbd",
        jobCenterName: "Pretoria CBD",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when OSRM responds ok but with a non-Ok result code", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ code: "NoRoute", durations: [] }),
    });

    await expect(
      getNearestJobCenter([{ lat: -25.75, lon: 28.19 }], destinations),
    ).rejects.toThrow("OSRM table returned code NoRoute");
  });

  it("returns a null result when a duration row's nearest index has no matching destination", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ code: "Ok", durations: [[500, 200, 100]] }),
    });

    const result = await getNearestJobCenter(
      [{ lat: -25.75, lon: 28.19 }],
      destinations,
    );

    expect(result).toEqual([
      { minutes: null, jobCenterId: null, jobCenterName: null },
    ]);
  });

  it("splits origins into batches of 50 and waits between batches", async () => {
    vi.useFakeTimers();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const firstBatchDurations = Array.from({ length: 50 }, () => [120, 800]);
    const secondBatchDurations = [[300, 900]];
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", durations: firstBatchDurations }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "Ok", durations: secondBatchDurations }),
      });

    const origins = Array.from({ length: 51 }, (_, index) => ({
      lat: -25.75 - index * 0.001,
      lon: 28.19,
    }));

    const resultPromise = getNearestJobCenter(origins, destinations);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(51);
    expect(result[50]).toEqual({
      minutes: 5,
      jobCenterId: "pretoria-cbd",
      jobCenterName: "Pretoria CBD",
    });
  });

  it("throws once retries are exhausted after repeated HTTP 429 responses", async () => {
    vi.useFakeTimers();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({ ok: false, status: 429 });

    const resultPromise = getNearestJobCenter(
      [{ lat: -25.75, lon: 28.19 }],
      destinations,
    );
    const assertion = expect(resultPromise).rejects.toThrow(
      "OSRM table request failed: 429",
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
