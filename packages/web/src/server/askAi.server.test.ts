import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import { describe, expect, it, vi } from "vitest";
import {
  ASK_AI_MODEL,
  askAiRequestSchema,
  buildChatMessages,
  buildSystemPrompt,
  createPlainTextTransform,
  getRateLimitKey,
  handleAskAiRequest,
  MAX_MESSAGE_LENGTH,
  RATE_LIMIT_RETRY_AFTER_SECONDS,
  streamAiReply,
} from "./askAi.server";
import type { Env } from "./env";

function sseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

async function readAllText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

function fakeEnv(overrides?: {
  aiRun?: Env["AI"]["run"];
  rateLimitSuccess?: boolean;
}): Env {
  return {
    AI: {
      run:
        overrides?.aiRun ??
        vi.fn(async () =>
          sseStream(['data: {"response":"ok"}\n\n', "data: [DONE]\n\n"]),
        ),
    },
    ASK_AI_RATE_LIMITER: {
      limit: vi.fn(async () => ({
        success: overrides?.rateLimitSuccess ?? true,
      })),
    },
  };
}

describe("buildSystemPrompt", () => {
  it("includes the domain's story, dataset summary, and layer descriptions", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain(GAUTENG_SPATIAL_LEGACY_DOMAIN.story.body);
    expect(prompt).toContain(GAUTENG_SPATIAL_LEGACY_DOMAIN.datasetSummary);
    expect(prompt).toContain("Layers:");
  });

  it("instructs the model to treat user content as data, not instructions", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toMatch(/never as instructions/i);
  });
});

describe("buildChatMessages", () => {
  it("puts the system prompt first, then history, then the new user message", () => {
    const messages = buildChatMessages(
      [{ role: "user", content: "Earlier question" }],
      "New question",
    );

    expect(messages[0]).toEqual({
      role: "system",
      content: buildSystemPrompt(),
    });
    expect(messages[1]).toEqual({ role: "user", content: "Earlier question" });
    expect(messages[2]).toEqual({ role: "user", content: "New question" });
  });
});

describe("getRateLimitKey", () => {
  it("uses the cf-connecting-ip header when present", () => {
    const request = new Request("https://example.com/api/ask", {
      headers: { "cf-connecting-ip": "203.0.113.4" },
    });

    expect(getRateLimitKey(request)).toBe("203.0.113.4");
  });

  it("falls back to a shared key when the header is absent", () => {
    const request = new Request("https://example.com/api/ask");

    expect(getRateLimitKey(request)).toBe("local-dev");
  });
});

describe("createPlainTextTransform", () => {
  it("extracts response text from SSE data frames", async () => {
    const stream = sseStream([
      'data: {"response":"Hel"}\n\n',
      'data: {"response":"lo!"}\n\n',
      "data: [DONE]\n\n",
    ]).pipeThrough(createPlainTextTransform());

    await expect(readAllText(stream)).resolves.toBe("Hello!");
  });

  it("skips malformed SSE frames without failing the stream", async () => {
    const stream = sseStream([
      "data: not json\n\n",
      'data: {"response":"still works"}\n\n',
    ]).pipeThrough(createPlainTextTransform());

    await expect(readAllText(stream)).resolves.toBe("still works");
  });

  it("ignores non-data lines", async () => {
    const stream = sseStream([
      "event: ping\n\n",
      'data: {"response":"ok"}\n\n',
    ]).pipeThrough(createPlainTextTransform());

    await expect(readAllText(stream)).resolves.toBe("ok");
  });

  it("flushes a trailing frame with no terminating newline", async () => {
    const stream = sseStream(['data: {"response":"trailing"}']).pipeThrough(
      createPlainTextTransform(),
    );

    await expect(readAllText(stream)).resolves.toBe("trailing");
  });

  it("handles a data frame split across multiple chunks", async () => {
    const encoder = new TextEncoder();
    const raw = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"resp'));
        controller.enqueue(encoder.encode('onse":"chunked"}\n\n'));
        controller.close();
      },
    });

    const stream = raw.pipeThrough(createPlainTextTransform());

    await expect(readAllText(stream)).resolves.toBe("chunked");
  });
});

describe("streamAiReply", () => {
  it("calls the AI binding with the model id, messages, and token/temperature limits", async () => {
    const aiRun = vi.fn(async () => sseStream(["data: [DONE]\n\n"]));
    const env = fakeEnv({ aiRun });

    await streamAiReply(env, [{ role: "user", content: "Hi" }]);

    expect(aiRun).toHaveBeenCalledWith(
      ASK_AI_MODEL,
      expect.objectContaining({
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
      }),
    );
  });

  it("adapts the AI binding's SSE stream into plain text", async () => {
    const env = fakeEnv({
      aiRun: vi.fn(async () =>
        sseStream(['data: {"response":"hi there"}\n\n', "data: [DONE]\n\n"]),
      ),
    });

    const stream = await streamAiReply(env, []);

    await expect(readAllText(stream)).resolves.toBe("hi there");
  });
});

describe("askAiRequestSchema", () => {
  it("accepts a message with no history", () => {
    const result = askAiRequestSchema.safeParse({ message: "Hi" });

    expect(result.success).toBe(true);
  });

  it("rejects an empty message", () => {
    const result = askAiRequestSchema.safeParse({ message: "" });

    expect(result.success).toBe(false);
  });

  it("rejects a message over the max length", () => {
    const result = askAiRequestSchema.safeParse({
      message: "x".repeat(MAX_MESSAGE_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("handleAskAiRequest", () => {
  function postRequest(body: unknown) {
    return new Request("https://example.com/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for a body that isn't valid JSON", async () => {
    const request = new Request("https://example.com/api/ask", {
      method: "POST",
      body: "not json",
    });

    const response = await handleAskAiRequest(request, fakeEnv());

    expect(response.status).toBe(400);
  });

  it("returns 400 for a body that fails schema validation", async () => {
    const response = await handleAskAiRequest(
      postRequest({ message: "" }),
      fakeEnv(),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("returns 429 with a Retry-After header when rate-limited", async () => {
    const response = await handleAskAiRequest(
      postRequest({ message: "Hi" }),
      fakeEnv({ rateLimitSuccess: false }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_RETRY_AFTER_SECONDS),
    );
  });

  it("streams a 200 plain-text response on success", async () => {
    const response = await handleAskAiRequest(
      postRequest({ message: "What does this map show?" }),
      fakeEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(response.body).not.toBeNull();
    const text = response.body ? await readAllText(response.body) : "";
    expect(text).toBe("ok");
  });

  it("returns 502 when the AI binding throws", async () => {
    const response = await handleAskAiRequest(
      postRequest({ message: "Hi" }),
      fakeEnv({
        aiRun: vi.fn(async () => {
          throw new Error("upstream down");
        }),
      }),
    );

    expect(response.status).toBe(502);
  });
});
