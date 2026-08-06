import { useEffect, useRef } from "react";

/** A single content block in a WebMCP tool's result, as consumed by the calling agent. */
export interface ModelContextToolContentBlock {
  type: "text";
  text: string;
}

/** The value a WebMCP tool's `execute` function resolves to. */
export interface ModelContextToolResult {
  content: ModelContextToolContentBlock[];
}

/**
 * A WebMCP tool definition, as registered via `document.modelContext.registerTool()`.
 * @remarks `inputSchema` is a JSON Schema object describing `execute`'s single
 *   argument; pass `{ type: "object", properties: {}, additionalProperties: false }`
 *   for a tool that takes no input.
 */
export interface ModelContextToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: TInput,
  ) => Promise<ModelContextToolResult> | ModelContextToolResult;
}

interface ModelContextProvider {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (input: unknown) => Promise<ModelContextToolResult>;
    },
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
}

declare global {
  interface Document {
    /**
     * WebMCP's tool-registration entry point (Chrome origin trial, see
     * https://webmachinelearning.github.io/webmcp/). Undefined in browsers
     * without WebMCP support, or when the `tools` Permissions-Policy denies it.
     */
    modelContext?: ModelContextProvider;
  }
}

/** Whether the current document exposes the WebMCP `document.modelContext` API. */
export function isModelContextSupported(): boolean {
  return typeof document !== "undefined" && !!document.modelContext;
}

/**
 * Registers a WebMCP tool for the lifetime of the calling component, so an
 * in-browser AI agent can discover and call it via `document.modelContext`.
 * @param definition - The tool to register, or `null` to skip registration
 *   (e.g. a tool that only makes sense when some optional data is present).
 * @remarks A no-op, including in SSR, wherever `document.modelContext` is
 *   unsupported or denied by Permissions-Policy — `registerTool`'s rejection
 *   in that case is swallowed since there's nothing meaningful to surface to
 *   the user for what is inherently a progressive enhancement. Re-registers
 *   only when `definition`'s `name` changes identity (including transitions
 *   to/from `null`); `description` and `inputSchema` are captured at
 *   registration time, since every current caller's schema is static for a
 *   given tool name, and a fresh `execute` closure on every render (the
 *   common case, since it closes over current component state) is read via
 *   a ref instead, so it can't itself trigger register/unregister churn.
 */
export function useModelContextTool<TInput = unknown>(
  definition: ModelContextToolDefinition<TInput> | null,
): void {
  const executeRef = useRef(definition?.execute);
  executeRef.current = definition?.execute;
  const definitionRef = useRef(definition);
  definitionRef.current = definition;

  // biome-ignore lint/correctness/useExhaustiveDependencies: definition?.name is a re-registration trigger, not read directly in the effect body — the effect reads the live value via definitionRef instead
  useEffect(() => {
    const currentDefinition = definitionRef.current;
    const modelContext = document.modelContext;
    if (!currentDefinition || !modelContext) {
      return;
    }

    const controller = new AbortController();
    modelContext
      .registerTool(
        {
          name: currentDefinition.name,
          description: currentDefinition.description,
          inputSchema: currentDefinition.inputSchema,
          execute: async (input: unknown) => {
            const execute = executeRef.current;
            if (!execute) {
              throw new Error(
                `Model context tool "${currentDefinition.name}" is no longer available.`,
              );
            }
            return execute(input as TInput);
          },
        },
        { signal: controller.signal },
      )
      .catch(() => {});

    return () => controller.abort();
  }, [definition?.name]);
}
