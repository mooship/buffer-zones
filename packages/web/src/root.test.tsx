import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { getLayers } from "./layers/registry";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    Meta: () => null,
    Links: () => null,
    Scripts: () => null,
    ScrollRestoration: () => null,
  };
});

const { default: Root, Layout, links, meta } = await import("./root");

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

describe("root meta", () => {
  it("sets the page title, description, and viewport", () => {
    const tags = meta({} as never);

    expect(tags).toContainEqual({ title: "Stratum" });
    expect(tags).toContainEqual(
      expect.objectContaining({ name: "description" }),
    );
    expect(tags).toContainEqual(
      expect.objectContaining({
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
      }),
    );
  });
});

describe("root Layout", () => {
  it("renders the document shell around its children", () => {
    const markup = renderToStaticMarkup(
      createElement(Layout, null, createElement("p", null, "app content")),
    );

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain("app content");
    expect(markup).toContain('src="/theme-bootstrap.js"');
    expect(markup).toContain('media="(prefers-color-scheme: light)"');
    expect(markup).toContain('media="(prefers-color-scheme: dark)"');
  });
});

describe("root Root", () => {
  it("renders the matched child route via Outlet", () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: Root,
        children: [
          {
            index: true,
            Component: () => createElement("p", null, "child route"),
          },
        ],
      },
    ]);

    render(createElement(Stub, { initialEntries: ["/"] }));

    expect(screen.getByText("child route")).toBeInTheDocument();
  });
});
