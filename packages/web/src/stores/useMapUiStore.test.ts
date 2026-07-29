import { beforeEach, describe, expect, it } from "vitest";
import { useMapUiStore } from "./useMapUiStore";

describe("useMapUiStore", () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    useMapUiStore.getState().reset();
  });

  it("owns the cross-cutting map UI defaults", () => {
    expect(useMapUiStore.getState()).toMatchObject({
      metroId: "tshwane",
      basemap: "street",
      panelView: "story",
      titleExpanded: true,
      selectedTownshipId: null,
      visibleLayerIds: ["townships"],
      panelOpen: true,
    });
  });

  it("toggles layers without duplicating IDs", () => {
    useMapUiStore.getState().toggleLayer("gautrain");
    useMapUiStore.getState().toggleLayer("gautrain");

    expect(useMapUiStore.getState().visibleLayerIds).toEqual(["townships"]);
  });

  it("updates navigation and map selection state", () => {
    const store = useMapUiStore.getState();
    store.setPanelView("places");
    store.setBasemap("satellite");
    store.setSelectedTownshipId("799045001");
    store.setTitleExpanded(false);

    expect(useMapUiStore.getState()).toMatchObject({
      basemap: "satellite",
      panelView: "places",
      selectedTownshipId: "799045001",
      titleExpanded: false,
    });
  });

  it("sets panelOpen directly", () => {
    useMapUiStore.getState().setPanelOpen(false);
    expect(useMapUiStore.getState().panelOpen).toBe(false);

    useMapUiStore.getState().setPanelOpen(true);
    expect(useMapUiStore.getState().panelOpen).toBe(true);
  });

  it("defaults the panel closed on reset when the viewport is mobile-width", () => {
    window.innerWidth = 500;
    useMapUiStore.getState().reset();

    expect(useMapUiStore.getState().panelOpen).toBe(false);
  });

  it("defaults the panel open on reset when the viewport is wider than the mobile breakpoint", () => {
    window.innerWidth = 1024;
    useMapUiStore.getState().reset();

    expect(useMapUiStore.getState().panelOpen).toBe(true);
  });

  it("switches metro, resets layers to that metro's defaults, and clears selection", () => {
    useMapUiStore.getState().setSelectedTownshipId("799045001");
    useMapUiStore.getState().toggleLayer("gautrain");

    useMapUiStore.getState().setMetro("johannesburg");

    expect(useMapUiStore.getState()).toMatchObject({
      metroId: "johannesburg",
      visibleLayerIds: ["townships"],
      selectedTownshipId: null,
    });
  });
});
