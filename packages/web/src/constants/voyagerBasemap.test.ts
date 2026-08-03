import { describe, expect, it, vi } from "vitest";

const registerBasemap = vi.fn();
vi.mock("@stratum/map", () => ({ registerBasemap }));

describe("registerVoyagerBasemap", () => {
  it("overrides the voyager basemap with app-tinted light/dark style JSON", async () => {
    const { registerVoyagerBasemap } = await import("./voyagerBasemap");

    registerVoyagerBasemap();

    expect(registerBasemap).toHaveBeenCalledWith(
      "voyager",
      expect.objectContaining({
        kind: "vector",
        styleUrl: "/styles/voyager-light.json",
        darkStyleUrl: "/styles/voyager-dark.json",
      }),
    );
  });
});
