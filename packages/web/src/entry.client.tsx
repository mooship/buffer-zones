import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./constants/themeConfig";
import { initTheme } from "./hooks/useThemePreference";

initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR });
hydrateRoot(document, <HydratedRouter />);
