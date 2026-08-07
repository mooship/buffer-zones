import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHandlerMock = vi.fn(async () => new Response("ok"));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    createRequestHandler: () => requestHandlerMock,
  };
});

describe("worker fetch handler", () => {
  beforeEach(() => {
    requestHandlerMock.mockClear();
  });

  it("redirects the old domain to the new domain, preserving path and query", async () => {
    const workerModule = await import("./app");
    const request = new Request(
      "https://buffer-zones.timothybrits.co.za/some/path?query=1",
    );
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://karta.timothybrits.co.za/some/path?query=1",
    );
  });

  it("passes requests on the new domain through to the request handler unchanged", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://karta.timothybrits.co.za/");
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(200);
  });

  it("passes the request through to the request handler unmodified", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://karta.timothybrits.co.za/");

    await workerModule.default.fetch(request);

    expect(requestHandlerMock).toHaveBeenCalledTimes(1);
    expect(requestHandlerMock).toHaveBeenCalledWith(request);
  });
});
