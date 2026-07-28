import type { LayerId, TownshipFeature } from "@buffer-zones/shared";
import clsx from "clsx";
import type { Feature } from "geojson";
import { Layers, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./App.module.css";
import { BasemapToggle } from "./components/BasemapToggle/BasemapToggle";
import { EvidenceSummary } from "./components/EvidenceSummary/EvidenceSummary";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { Legend } from "./components/Legend/Legend";
import { MapView } from "./components/MapView/MapView";
import type { Basemap } from "./constants/basemaps";
import {
  APP_NAME,
  APP_TAGLINE,
  DATA_AS_OF,
  DATA_SOURCES,
} from "./constants/metadata";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { fetchFeatureCollection } from "./data/fetchFeatureCollection";
import { LAYER_REGISTRY } from "./layers/registry";

const repository = createTownshipDataRepository("/data/townships.v1.geojson");

const DEFAULT_VISIBLE_LAYER_IDS: LayerId[] = LAYER_REGISTRY.filter(
  (layer) => layer.defaultVisible,
).map((layer) => layer.id);

const MOBILE_BREAKPOINT_PX = 768;
type PanelView = "evidence" | "layers";

export function App() {
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [townshipAreas, setTownshipAreas] = useState<Feature[]>([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<LayerId[]>(
    DEFAULT_VISIBLE_LAYER_IDS,
  );
  const [basemap, setBasemap] = useState<Basemap>("street");
  const [panelOpen, setPanelOpen] = useState(
    () => window.innerWidth > MOBILE_BREAKPOINT_PX,
  );
  const [panelView, setPanelView] = useState<PanelView>("layers");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      repository.getTownships(),
      fetchFeatureCollection("/data/township-areas.v1.geojson"),
    ]).then(([features, areas]) => {
      if (!cancelled) {
        setTownships(features);
        setTownshipAreas(areas.features);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleToggle(id: LayerId) {
    setVisibleLayerIds((current) =>
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id],
    );
  }

  return (
    <div className={styles.app}>
      <MapView
        townships={townships}
        townshipAreas={townshipAreas}
        visibleLayerIds={visibleLayerIds}
        basemap={basemap}
      />

      <header className={clsx(styles.titleBlock, styles.ticked)}>
        <h1 className={styles.title}>{APP_NAME}</h1>
        <p className={styles.tagline}>{APP_TAGLINE}</p>
        <p className={styles.stamp}>Data as of {DATA_AS_OF}</p>
      </header>

      <button
        type="button"
        className={styles.panelTrigger}
        aria-expanded={panelOpen}
        aria-controls="map-controls"
        onClick={() => setPanelOpen((open) => !open)}
      >
        {panelOpen ? <X aria-hidden="true" /> : <Layers aria-hidden="true" />}
        {panelOpen ? "Close" : "Layers"}
      </button>

      <aside
        id="map-controls"
        className={clsx(styles.panel, styles.ticked)}
        hidden={!panelOpen}
      >
        <div className={styles.panelTabs} role="tablist" aria-label="Map panel">
          <button
            type="button"
            role="tab"
            aria-selected={panelView === "layers"}
            className={styles.panelTab}
            onClick={() => setPanelView("layers")}
          >
            Map layers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelView === "evidence"}
            className={styles.panelTab}
            onClick={() => setPanelView("evidence")}
          >
            Evidence
          </button>
        </div>

        {panelView === "evidence" ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Why this map exists</h2>
            <EvidenceSummary />
          </section>
        ) : (
          <div className={styles.panelContent}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Map legend</h2>
              <Legend />
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Layers</h2>
              <LayerToggles
                visibleLayerIds={visibleLayerIds}
                onToggle={handleToggle}
              />
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Basemap</h2>
              <BasemapToggle basemap={basemap} onChange={setBasemap} />
            </section>
          </div>
        )}
      </aside>

      <footer className={styles.attribution}>
        {DATA_SOURCES.map((source) => (
          <span key={source}>{source}</span>
        ))}
      </footer>
    </div>
  );
}
