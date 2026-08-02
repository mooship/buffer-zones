import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAbortController } from "./useAbortController";

describe("useAbortController", () => {
  it("next() returns a fresh, non-aborted signal", () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal | undefined;
    act(() => {
      signal = result.current.next();
    });

    expect(signal?.aborted).toBe(false);
  });

  it("next() aborts the previous signal it returned", () => {
    const { result } = renderHook(() => useAbortController());

    let firstSignal: AbortSignal | undefined;
    let secondSignal: AbortSignal | undefined;
    act(() => {
      firstSignal = result.current.next();
    });
    act(() => {
      secondSignal = result.current.next();
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal?.aborted).toBe(false);
  });

  it("abort() aborts the current signal without creating a new one", () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal | undefined;
    act(() => {
      signal = result.current.next();
    });
    act(() => {
      result.current.abort();
    });

    expect(signal?.aborted).toBe(true);
  });

  it("aborts the current signal on unmount", () => {
    const { result, unmount } = renderHook(() => useAbortController());

    let signal: AbortSignal | undefined;
    act(() => {
      signal = result.current.next();
    });
    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("returns stable next/abort function references across renders", () => {
    const { result, rerender } = renderHook(() => useAbortController());
    const first = result.current;
    rerender();

    expect(result.current.next).toBe(first.next);
    expect(result.current.abort).toBe(first.abort);
  });
});
