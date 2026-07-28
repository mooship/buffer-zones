import "@fontsource-variable/fraunces";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/martian-mono";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// App is added in Task 15 — a minimal placeholder keeps main.tsx buildable
// as soon as the scaffold exists.
function App() {
  return <div>Buffer Zones</div>;
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
