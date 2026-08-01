import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  createRequestHandler: () => vi.fn(async () => new Response("ok")),
}));

describe("worker fetch handler", () => {
  it("redirects the old domain to the new domain, preserving path and query", async () => {
    const workerModule = await import("./app");
    const request = new Request(
      "https://buffer-zones.timothybrits.co.za/some/path?query=1",
    );
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://stratum.timothybrits.co.za/some/path?query=1",
    );
  });

  it("passes requests on the new domain through to the request handler unchanged", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://stratum.timothybrits.co.za/");
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(200);
  });
});
