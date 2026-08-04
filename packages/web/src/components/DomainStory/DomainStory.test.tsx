import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainStory } from "./DomainStory";

describe("DomainStory", () => {
  it("renders the story body text", () => {
    render(
      <DomainStory
        story={{ title: "Why this map exists", body: "Some context." }}
      />,
    );

    expect(screen.getByText("Some context.")).toBeInTheDocument();
  });

  it("doesn't render its own heading — the caller renders the story title", () => {
    render(
      <DomainStory
        story={{ title: "Why this map exists", body: "Some context." }}
      />,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
