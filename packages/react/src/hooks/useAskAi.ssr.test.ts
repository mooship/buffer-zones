// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("useAskAi on the server", () => {
  it("renders idle with no messages and no error when window is unavailable", async () => {
    const { useAskAi } = await import("./useAskAi");

    function Consumer() {
      const { messages, status, error } = useAskAi();
      return `${messages.length}|${status}|${error}`;
    }

    const markup = renderToStaticMarkup(createElement(Consumer));

    expect(markup).toBe("0|idle|null");
  });
});
