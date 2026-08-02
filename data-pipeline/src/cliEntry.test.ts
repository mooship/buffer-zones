import { describe, expect, it } from "vitest";
import { isDirectExecution } from "./cliEntry";

describe("isDirectExecution", () => {
  it("returns true when argv[1] resolves to the given module URL", () => {
    expect(
      isDirectExecution(
        ["node", "/repo/src/cleanCache.ts"],
        "file:///repo/src/cleanCache.ts",
      ),
    ).toBe(true);
  });

  it("returns false when argv[1] resolves to a different module", () => {
    expect(
      isDirectExecution(
        ["node", "/repo/src/validateOutput.ts"],
        "file:///repo/src/cleanCache.ts",
      ),
    ).toBe(false);
  });

  it("returns false when argv has no command path", () => {
    expect(isDirectExecution(["node"], "file:///repo/src/cleanCache.ts")).toBe(
      false,
    );
  });
});
