import { initAskAi, initTheme } from "@stratum/react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { ASK_AI_ENDPOINT } from "./constants/askAi";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./constants/themeConfig";

initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR });
initAskAi({ endpoint: ASK_AI_ENDPOINT });
hydrateRoot(document, <HydratedRouter />);
