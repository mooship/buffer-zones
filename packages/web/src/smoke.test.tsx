import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("renders a DOM node via happy-dom", () => {
    render(<div data-testid="probe">ok</div>);
    expect(screen.getByTestId("probe")).toHaveTextContent("ok");
  });
});
