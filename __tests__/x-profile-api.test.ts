/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../pages/api/x/profile";
import { getXFeed, XFeedError } from "../lib/x-profile.server";
import { xFeedFixture } from "../tests/fixtures/x-profile";

jest.mock("../lib/x-profile.server", () => {
  const original = jest.requireActual("../lib/x-profile.server");
  return { ...original, getXFeed: jest.fn() };
});
const feed = jest.mocked(getXFeed);
function response() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return { res: res as unknown as NextApiResponse, headers, raw: res };
}
const request = (method = "GET", query = {}) =>
  ({ method, query }) as NextApiRequest;
beforeEach(() => {
  jest.clearAllMocks();
});
it.each(["POST", "PATCH", "DELETE", "OPTIONS"])(
  "refuses %s without touching X",
  async (method) => {
    const { res, headers, raw } = response();
    await handler(request(method), res);
    expect(raw.status).toHaveBeenCalledWith(405);
    expect(headers.Allow).toBe("GET");
    expect(feed).not.toHaveBeenCalled();
  },
);
it.each([
  { username: "different" },
  { cursor: ["x", "y"] },
  { cursor: "" },
  { cursor: "a".repeat(2049) },
  { randomCacheBust: "1" },
])(
  "refuses arbitrary query parameters before a paid request",
  async (query) => {
    const { res, raw } = response();
    await handler(request("GET", query), res);
    expect(raw.status).toHaveBeenCalledWith(400);
    expect(feed).not.toHaveBeenCalled();
  },
);
it("bounds CDN cache age to the freshness remaining and sends only the public shape", async () => {
  jest
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse(xFeedFixture.fetchedAt) + 899000);
  feed.mockResolvedValue(xFeedFixture);
  const { res, headers, raw } = response();
  await handler(request(), res);
  expect(headers["Cache-Control"]).toBe(
    "public, max-age=0, s-maxage=1, must-revalidate",
  );
  expect(raw.json).toHaveBeenCalledWith(xFeedFixture);
  jest.restoreAllMocks();
});
it.each([
  ["not_configured", 503],
  ["unavailable", 503],
  ["invalid_cursor", 400],
  ["rate_limited", 429],
  ["timeout", 503],
] as const)("reports %s without caching the error", async (code, status) => {
  feed.mockRejectedValue(new XFeedError(code, 90));
  const { res, headers, raw } = response();
  await handler(request(), res);
  expect(headers["Cache-Control"]).toBe("no-store");
  expect(headers["Retry-After"]).toBe("90");
  expect(raw.status).toHaveBeenCalledWith(status);
  expect(raw.json).toHaveBeenCalledWith({ code, retryAfter: 90 });
});
it("does not expose thrown credential-bearing errors to the client", async () => {
  feed.mockRejectedValue(new Error("secret-fixture-do-not-forward"));
  const { res, raw } = response();
  await handler(request(), res);
  expect(raw.json).toHaveBeenCalledWith({
    code: "unavailable",
    retryAfter: 60,
  });
});
