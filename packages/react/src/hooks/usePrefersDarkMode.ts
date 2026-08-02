import { useMediaQuery } from "usehooks-ts";

const QUERY = "(prefers-color-scheme: dark)";

/**
 * Returns `true` when the user's OS preference is dark mode.
 * @remarks Initialises to `false` on first render to avoid SSR mismatch.
 */
export function usePrefersDarkMode() {
  return useMediaQuery(QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
}
