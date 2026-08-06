import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isModelContextSupported,
  type ModelContextToolDefinition,
  useModelContextTool,
} from "./useModelContextTool";

function stubModelContext() {
  const registerTool = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool },
  });
  return registerTool;
}

function clearModelContext() {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: undefined,
  });
}

function makeTool(
  overrides: Partial<ModelContextToolDefinition<{ value: string }>> = {},
): ModelContextToolDefinition<{ value: string }> {
  return {
    name: "example-tool",
    description: "An example tool.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "string" } },
      required: ["value"],
    },
    execute: () => ({ content: [{ type: "text", text: "ok" }] }),
    ...overrides,
  };
}

describe("isModelContextSupported", () => {
  afterEach(() => {
    clearModelContext();
  });

  it("is false when document.modelContext is absent", () => {
    clearModelContext();
    expect(isModelContextSupported()).toBe(false);
  });

  it("is true when document.modelContext is present", () => {
    stubModelContext();
    expect(isModelContextSupported()).toBe(true);
  });
});

describe("useModelContextTool", () => {
  afterEach(() => {
    clearModelContext();
  });

  it("registers the tool with document.modelContext when supported", () => {
    const registerTool = stubModelContext();
    const tool = makeTool();

    renderHook(() => useModelContextTool(tool));

    expect(registerTool).toHaveBeenCalledTimes(1);
    const [registeredTool, options] = registerTool.mock.calls[0];
    expect(registeredTool).toMatchObject({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    });
    expect(typeof registeredTool.execute).toBe("function");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("does nothing when document.modelContext is unsupported", () => {
    clearModelContext();
    expect(() =>
      renderHook(() => useModelContextTool(makeTool())),
    ).not.toThrow();
  });

  it("does nothing when the definition is null", () => {
    const registerTool = stubModelContext();

    renderHook(() => useModelContextTool(null));

    expect(registerTool).not.toHaveBeenCalled();
  });

  it("aborts the registration signal on unmount", () => {
    const registerTool = stubModelContext();
    const { unmount } = renderHook(() => useModelContextTool(makeTool()));

    const [, options] = registerTool.mock.calls[0];
    const signal = options?.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("does not re-register when only the execute closure changes", () => {
    const registerTool = stubModelContext();
    const { rerender } = renderHook(
      ({ execute }) => useModelContextTool(makeTool({ execute })),
      { initialProps: { execute: () => ({ content: [] }) } },
    );

    rerender({ execute: () => ({ content: [{ type: "text", text: "b" }] }) });

    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("calls the latest execute closure even after a rerender", async () => {
    stubModelContext();
    const first = vi.fn().mockReturnValue({ content: [] });
    const second = vi.fn().mockReturnValue({ content: [] });
    const { rerender } = renderHook(
      ({ execute }) => useModelContextTool(makeTool({ execute })),
      { initialProps: { execute: first } },
    );

    rerender({ execute: second });

    const registerTool = document.modelContext?.registerTool as ReturnType<
      typeof vi.fn
    >;
    const [registeredTool] = registerTool.mock.calls[0];
    await registeredTool.execute({ value: "x" });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ value: "x" });
  });

  it("re-registers, aborting the previous signal, when the tool name changes", () => {
    const registerTool = stubModelContext();
    const { rerender } = renderHook(
      ({ name }) => useModelContextTool(makeTool({ name })),
      { initialProps: { name: "tool-a" } },
    );

    const [, firstOptions] = registerTool.mock.calls[0];
    const firstSignal = firstOptions?.signal as AbortSignal;

    rerender({ name: "tool-b" });

    expect(firstSignal.aborted).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registerTool.mock.calls[1][0]).toMatchObject({ name: "tool-b" });
  });

  it("unregisters when the definition transitions to null", () => {
    const registerTool = stubModelContext();
    const { rerender } = renderHook(({ tool }) => useModelContextTool(tool), {
      initialProps: {
        tool: makeTool() as ModelContextToolDefinition<{
          value: string;
        }> | null,
      },
    });

    const [, options] = registerTool.mock.calls[0];
    const signal = options?.signal as AbortSignal;

    rerender({ tool: null });

    expect(signal.aborted).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("throws from the registered execute wrapper once the definition becomes null", async () => {
    const registerTool = stubModelContext();
    const { rerender } = renderHook(({ tool }) => useModelContextTool(tool), {
      initialProps: {
        tool: makeTool() as ModelContextToolDefinition<{
          value: string;
        }> | null,
      },
    });

    const [registeredTool] = registerTool.mock.calls[0];

    rerender({ tool: null });

    await expect(registeredTool.execute({ value: "x" })).rejects.toThrow(
      /no longer available/,
    );
  });

  it("swallows a rejected registerTool call", async () => {
    const registerTool = vi
      .fn()
      .mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });

    expect(() =>
      renderHook(() => useModelContextTool(makeTool())),
    ).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
