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
      titleExpanded: true,
      selectedTownshipId: null,
    });
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

  it("keeps modeled car time and nearest-transit mutually exclusive", () => {
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
});
