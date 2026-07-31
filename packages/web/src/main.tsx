import "@fontsource-variable/inter";
import "@fontsource-variable/martian-mono";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

registerSW({
  immediate: true,
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
