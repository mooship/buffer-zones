import type { Basemap } from "@stratum/map";
import { create } from "zustand";
import { getLayerGroups, getLayers } from "../layers/registry";

function findGroupContaining(id: string) {
  return getLayerGroups().find((group) => group.layerIds.includes(id));
}

function isExclusiveGroupMember(id: string): boolean {
  return findGroupContaining(id)?.selectionMode === "exclusive";
}

function groupSiblings(id: string): string[] {
  const group = findGroupContaining(id);
  if (!group || group.selectionMode !== "exclusive") {
    return [];
  }
  return group.layerIds.filter((sibling) => sibling !== id);
}

export type PanelView = "story" | "places" | "layers";

interface MapUiState {
  visibleLayerIds: string[];
  basemap: Basemap;
  panelOpen: boolean;
  panelView: PanelView;
  titleExpanded: boolean;
  selectedFeatureId: string | null;
  toggleLayer: (id: string) => void;
  setBasemap: (basemap: Basemap) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelView: (view: PanelView) => void;
  setTitleExpanded: (expanded: boolean) => void;
  setSelectedFeatureId: (id: string | null) => void;
  reset: () => void;
}

function createInitialState() {
  return {
    visibleLayerIds: getLayers()
      .filter((layer) => layer.defaultVisible)
      .map((layer) => layer.id),
    basemap: "street" as const,
    panelOpen: false,
    panelView: "story" as const,
    titleExpanded: false,
    selectedFeatureId: null,
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

      if (isExclusiveGroupMember(id)) {
        const siblings = groupSiblings(id);
        return {
          visibleLayerIds: [
            ...state.visibleLayerIds.filter(
              (existing) => !siblings.includes(existing),
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
  setSelectedFeatureId: (selectedFeatureId) => set({ selectedFeatureId }),
  reset: () => set(createInitialState()),
}));
