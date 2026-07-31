import type { LayerId } from "@buffer-zones/shared";
import { create } from "zustand";
import type { Basemap } from "../constants/basemaps";
import { getLayerDefinitions } from "../layers/registry";

const MOBILE_BREAKPOINT_PX = 768;
const ACCESS_LAYER_IDS: readonly LayerId[] = ["townships", "nearest-transit"];

function isAccessLayer(id: LayerId): boolean {
  return ACCESS_LAYER_IDS.includes(id);
}

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
  const isDesktop =
    typeof window !== "undefined" && window.innerWidth > MOBILE_BREAKPOINT_PX;

  return {
    visibleLayerIds: getLayerDefinitions()
      .filter((layer) => layer.defaultVisible)
      .map((layer) => layer.id),
    basemap: "street" as const,
    panelOpen: isDesktop,
    panelView: "story" as const,
    titleExpanded: isDesktop,
    selectedTownshipId: null,
  };
}

export const useMapUiStore = create<MapUiState>()((set) => ({
  ...createInitialState(),
  toggleLayer: (id) =>
    set((state) => {
      if (state.visibleLayerIds.includes(id)) {
        return {
          visibleLayerIds: state.visibleLayerIds.filter(
            (existing) => existing !== id,
          ),
        };
      }

      if (isAccessLayer(id)) {
        return {
          visibleLayerIds: [
            ...state.visibleLayerIds.filter(
              (existing) => !isAccessLayer(existing),
            ),
            id,
          ],
        };
      }

      return { visibleLayerIds: [...state.visibleLayerIds, id] };
    }),
  setBasemap: (basemap) => set({ basemap }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelView: (panelView) => set({ panelView }),
  setTitleExpanded: (titleExpanded) => set({ titleExpanded }),
  setSelectedTownshipId: (selectedTownshipId) => set({ selectedTownshipId }),
  reset: () => set(createInitialState()),
}));
