import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefersDarkMode } from "./usePrefersDarkMode";

function stubMatchMedia(initialMatches: boolean) {
  let changeListener: (() => void) | undefined;
  let matches = initialMatches;

  const mediaQueryList = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") {
        changeListener = listener;
      }
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change" && changeListener === listener) {
        changeListener = undefined;
      }
    }),
  };

  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList));

  return {
    triggerChange(nextMatches: boolean) {
      matches = nextMatches;
      changeListener?.();
    },
    mediaQueryList,
  };
}

describe("usePrefersDarkMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reflects the current matchMedia value", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => usePrefersDarkMode());

    expect(result.current).toBe(true);
  });

  it("updates when the media query change event fires", () => {
    const { triggerChange } = stubMatchMedia(false);
    const { result } = renderHook(() => usePrefersDarkMode());

    expect(result.current).toBe(false);

    act(() => {
      triggerChange(true);
    });

    expect(result.current).toBe(true);
  });

  it("unsubscribes from the media query on unmount", () => {
    const { mediaQueryList } = stubMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersDarkMode());

    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
