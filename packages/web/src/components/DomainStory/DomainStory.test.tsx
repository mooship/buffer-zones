import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainStory } from "./DomainStory";

describe("DomainStory", () => {
  it("renders the story title as a heading and the body as text", () => {
    render(
      <DomainStory
        story={{ title: "Why this map exists", body: "Some context." }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Why this map exists" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Some context.")).toBeInTheDocument();
  });
});
