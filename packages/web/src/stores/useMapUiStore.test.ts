import { beforeEach, describe, expect, it } from "vitest";
import { useMapUiStore } from "./useMapUiStore";

describe("useMapUiStore", () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    useMapUiStore.getState().reset();
  });

  it("owns the cross-cutting map UI defaults", () => {
    expect(useMapUiStore.getState()).toMatchObject({
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
});
