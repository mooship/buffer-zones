import { initTheme } from "@karta/react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./constants/themeConfig";

initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR });
hydrateRoot(document, <HydratedRouter />);
