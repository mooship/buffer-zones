import { useMediaQuery } from "usehooks-ts";

const QUERY = "(prefers-color-scheme: dark)";

export function usePrefersDarkMode() {
  return useMediaQuery(QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
}
