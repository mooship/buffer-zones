import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initAskAi, resetAskAi, useAskAi } from "./useAskAi";

function streamingResponse(chunks: string[], init?: ResponseInit) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200, ...init });
}

function jsonErrorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useAskAi", () => {
  beforeEach(() => {
    initAskAi({ endpoint: "/api/ask" });
    resetAskAi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws if askAi is called before initAskAi", async () => {
    vi.resetModules();
    const freshModule = await import("./useAskAi");

    await expect(freshModule.askAi("Hi")).rejects.toThrow(
      "initAskAi must be called before askAi",
    );
  });

  it("appends the question as a user message immediately", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamingResponse(["Hello"])),
    );
    const { result } = renderHook(() => useAskAi());

    act(() => {
      result.current.ask("What is this map?");
    });

    expect(result.current.messages).toEqual([
      { id: 1, role: "user", content: "What is this map?" },
    ]);
  });

  it("streams the assistant's reply chunk by chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamingResponse(["Hel", "lo!"])),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.messages).toEqual([
      { id: 1, role: "user", content: "Hi" },
      { id: 2, role: "assistant", content: "Hello!" },
    ]);
  });

  it("sends only role/content for prior turns, stripping message ids from the request body", async () => {
    const fetchMock = vi.fn(async () => streamingResponse(["ok"]));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("First");
    });
    await act(async () => {
      await result.current.ask("Second");
    });

    const secondCallBody = JSON.parse(
      fetchMock.mock.calls[1]?.[1]?.body as string,
    );
    expect(secondCallBody.history).toEqual([
      { role: "user", content: "First" },
      { role: "assistant", content: "ok" },
    ]);
  });

  it("sets status to streaming while a request is in flight", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const { result } = renderHook(() => useAskAi());

    act(() => {
      result.current.ask("Hi");
    });

    expect(result.current.status).toBe("streaming");

    await act(async () => {
      resolveFetch(streamingResponse(["done"]));
      await waitFor(() => expect(result.current.status).toBe("idle"));
    });
  });

  it("ignores a new ask() call while already streaming", async () => {
    const fetchMock = vi.fn(async () => streamingResponse(["one"]));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAskAi());

    let firstCall!: Promise<void>;
    act(() => {
      firstCall = result.current.ask("First");
      result.current.ask("Second");
    });
    await act(async () => {
      await firstCall;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the server's JSON error message on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonErrorResponse(429, "Too many requests")),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Too many requests");
  });

  it("falls back to a generic error message when the JSON body has no error string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ retryAfterSeconds: 30 }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });

    expect(result.current.error).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("falls back to a generic error message when the response body isn't valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 500 })),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });

    expect(result.current.error).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("sets an error status when the fetch call itself rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("clears the conversation on reset", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamingResponse(["Hi there"])),
    );
    const { result } = renderHook(() => useAskAi());

    await act(async () => {
      await result.current.ask("Hi");
    });
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
