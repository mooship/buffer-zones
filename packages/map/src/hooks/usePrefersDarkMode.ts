import { useMediaQuery } from "usehooks-ts";

const QUERY = "(prefers-color-scheme: dark)";

/**
 * Tracks the OS-level `prefers-color-scheme: dark` media query.
 * @returns `true` when the operating system currently prefers dark mode.
 * @remarks Interim copy pending `@stratum/react` (Task 3), which will host
 *   this hook for reuse outside `@stratum/map`.
 */
export function usePrefersDarkMode() {
  return useMediaQuery(QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
}
