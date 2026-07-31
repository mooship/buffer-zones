import { describe, expect, it } from "vitest";
import { getLayers } from "./layers/registry";
import { links } from "./root";

describe("root links", () => {
  it("includes exactly one preload link per unique dataSource URL", () => {
    const uniqueUrls = new Set(
      getLayers().flatMap((layer) => layer.dataSource),
    );

    const preloadLinks = links().filter(
      (link) => "rel" in link && link.rel === "preload",
    );

    expect(preloadLinks).toHaveLength(uniqueUrls.size);

    const hrefs = preloadLinks.map((link) =>
      "href" in link ? link.href : undefined,
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const url of uniqueUrls) {
      expect(hrefs).toContain(url);
    }
  });

  it("does not mark a defaultVisible layer's URL as low priority, but marks an invisible-only URL as low priority", () => {
    const sharedUrl = getLayers().find((layer) => layer.id === "townships")
      ?.dataSource[0];
    const invisibleOnlyUrl = getLayers().find(
      (layer) => layer.id === "rapid-rail",
    )?.dataSource[0];

    expect(sharedUrl).toBeDefined();
    expect(invisibleOnlyUrl).toBeDefined();

    const preloadLinks = links().filter(
      (link) => "rel" in link && link.rel === "preload",
    );

    const sharedLink = preloadLinks.find(
      (link) => "href" in link && link.href === sharedUrl,
    );
    const invisibleOnlyLink = preloadLinks.find(
      (link) => "href" in link && link.href === invisibleOnlyUrl,
    );

    expect(sharedLink).toBeDefined();
    expect(sharedLink).not.toHaveProperty("fetchPriority");

    expect(invisibleOnlyLink).toBeDefined();
    expect(invisibleOnlyLink).toHaveProperty("fetchPriority", "low");
  });
});
