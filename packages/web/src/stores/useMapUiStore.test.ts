import { act } from "@testing-library/react";
import { useMapUiStore } from "./useMapUiStore";

describe("useMapUiStore", () => {
  beforeEach(() => {
    act(() => {
      useMapUiStore.getState().reset();
    });
  });

  it("initializes with default state", () => {
    const state = useMapUiStore.getState();
    expect(state).toMatchObject({
      visibleLayerIds: ["townships"],
      basemap: "street",
      panelOpen: false,
      panelView: "layers",
      selectedFeatureId: null,
    });
  });

  it("sets the panel view", () => {
    act(() => {
      useMapUiStore.getState().setPanelView("story");
    });
    expect(useMapUiStore.getState().panelView).toBe("story");

    act(() => {
      useMapUiStore.getState().setPanelView("layers");
    });
    expect(useMapUiStore.getState().panelView).toBe("layers");
  });

  it("toggles layer visibility", () => {
    act(() => {
      useMapUiStore.getState().toggleLayer("rapid-rail");
    });
    expect(useMapUiStore.getState().visibleLayerIds).toContain("rapid-rail");

    act(() => {
      useMapUiStore.getState().toggleLayer("rapid-rail");
    });
    expect(useMapUiStore.getState().visibleLayerIds).not.toContain(
      "rapid-rail",
    );
  });

  it("keeps modelled car time and nearest-transit mutually exclusive", () => {
    act(() => {
      useMapUiStore.getState().toggleLayer("nearest-transit");
    });
    expect(useMapUiStore.getState().visibleLayerIds).toContain(
      "nearest-transit",
    );
    expect(useMapUiStore.getState().visibleLayerIds).not.toContain("townships");

    act(() => {
      useMapUiStore.getState().toggleLayer("townships");
    });
    expect(useMapUiStore.getState().visibleLayerIds).toContain("townships");
    expect(useMapUiStore.getState().visibleLayerIds).not.toContain(
      "nearest-transit",
    );
  });

  it("sets the basemap", () => {
    act(() => {
      useMapUiStore.getState().setBasemap("satellite");
    });
    expect(useMapUiStore.getState().basemap).toBe("satellite");
  });
});
