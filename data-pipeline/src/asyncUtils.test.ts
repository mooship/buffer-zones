import { describe, expect, it, vi } from "vitest";
import { sleep } from "./asyncUtils";

describe("sleep", () => {
  it("resolves after the given number of milliseconds", async () => {
    vi.useFakeTimers();
    const resolved = vi.fn();

    sleep(1000).then(resolved);
    await vi.advanceTimersByTimeAsync(999);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
