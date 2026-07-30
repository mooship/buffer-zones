import type { LayerId } from "@buffer-zones/shared";
import { create } from "zustand";
import type { Basemap } from "../constants/basemaps";
import { getLayerDefinitions } from "../layers/registry";

const MOBILE_BREAKPOINT_PX = 768;

export type PanelView = "story" | "places" | "layers";

interface MapUiState {
  visibleLayerIds: LayerId[];
  basemap: Basemap;
  panelOpen: boolean;
  panelView: PanelView;
  titleExpanded: boolean;
  selectedTownshipId: string | null;
  toggleLayer: (id: LayerId) => void;
  setBasemap: (basemap: Basemap) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelView: (view: PanelView) => void;
  setTitleExpanded: (expanded: boolean) => void;
  setSelectedTownshipId: (id: string | null) => void;
  reset: () => void;
}

function createInitialState() {
  return {
    visibleLayerIds: getLayerDefinitions()
      .filter((layer) => layer.defaultVisible)
      .map((layer) => layer.id),
    basemap: "street" as const,
    panelOpen: window.innerWidth > MOBILE_BREAKPOINT_PX,
    panelView: "story" as const,
    titleExpanded: true,
    selectedTownshipId: null,
  };
}

export const useMapUiStore = create<MapUiState>()((set) => ({
  ...createInitialState(),
  toggleLayer: (id) =>
    set((state) => ({
      visibleLayerIds: state.visibleLayerIds.includes(id)
        ? state.visibleLayerIds.filter((existing) => existing !== id)
        : [...state.visibleLayerIds, id],
    })),
  setBasemap: (basemap) => set({ basemap }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelView: (panelView) => set({ panelView }),
  setTitleExpanded: (titleExpanded) => set({ titleExpanded }),
  setSelectedTownshipId: (selectedTownshipId) => set({ selectedTownshipId }),
  reset: () => set(createInitialState()),
}));
