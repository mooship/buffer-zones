import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/server/env";
import { envContext } from "../src/server/envContext";

const requestHandlerMock = vi.fn(async () => new Response("ok"));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    createRequestHandler: () => requestHandlerMock,
  };
});

function fakeEnv(): Env {
  return {
    AI: { run: vi.fn() },
    ASK_AI_RATE_LIMITER: { limit: vi.fn() },
  };
}

describe("worker fetch handler", () => {
  beforeEach(() => {
    requestHandlerMock.mockClear();
  });

  it("redirects the old domain to the new domain, preserving path and query", async () => {
    const workerModule = await import("./app");
    const request = new Request(
      "https://buffer-zones.timothybrits.co.za/some/path?query=1",
    );
    const response = await workerModule.default.fetch(request, fakeEnv());
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://stratum.timothybrits.co.za/some/path?query=1",
    );
  });

  it("passes requests on the new domain through to the request handler unchanged", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://stratum.timothybrits.co.za/");
    const response = await workerModule.default.fetch(request, fakeEnv());
    expect(response.status).toBe(200);
  });

  it("threads the Cloudflare env into the request handler's router context", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://stratum.timothybrits.co.za/");
    const env = fakeEnv();

    await workerModule.default.fetch(request, env);

    expect(requestHandlerMock).toHaveBeenCalledTimes(1);
    const [passedRequest, passedContext] = requestHandlerMock.mock.calls[0] as [
      Request,
      { get: (context: typeof envContext) => Env },
    ];
    expect(passedRequest).toBe(request);
    expect(passedContext.get(envContext)).toBe(env);
  });
});
