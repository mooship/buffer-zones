import { initTheme } from "@stratum/react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./constants/themeConfig";
import { registerVoyagerBasemap } from "./constants/voyagerBasemap";

initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR });
registerVoyagerBasemap();
hydrateRoot(document, <HydratedRouter />);
