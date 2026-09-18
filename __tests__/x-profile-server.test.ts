/** @jest-environment node */
import { rawXProfile } from "../tests/fixtures/x-profile";

type Service = typeof import("../lib/x-profile.server");
let service: Service;
let fetchMock: jest.SpyInstance;
const env = { ...process.env };
const rawPost = {
  id: "1001",
  text: "Provider fixture post",
  author_id: "12345",
  created_at: "2026-09-18T12:00:00Z",
};
const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers });
beforeEach(() => {
  jest.resetModules();
  process.env = { ...env, X_BEARER_TOKEN: "test-bearer-not-a-credential" };
  delete process.env.X_API_FIELD_STYLE;
  service = require("../lib/x-profile.server");
  fetchMock = jest.spyOn(global, "fetch");
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = env;
});

describe("authentication and cursor safety", () => {
  it("needs all four OAuth fields, accepts app-only bearer, and respects the kill switch", () => {
    expect(
      service.xCredentials({ X_ACCESS_TOKEN: "a", X_ACCESS_TOKEN_SECRET: "b" }),
    ).toBeNull();
    expect(service.xCredentials({ X_BEARER_TOKEN: " test " })).toEqual({
      bearer: "test",
    });
    expect(
      service.xCredentials({ X_BEARER_TOKEN: "test", X_FEED_ENABLED: "false" }),
    ).toBeNull();
    expect(
      service.xCredentials({
        X_API_KEY: "k",
        X_API_SECRET: "s",
        X_ACCESS_TOKEN: "t",
        X_ACCESS_TOKEN_SECRET: "ts",
      }),
    ).toEqual({ key: "k", secret: "s", token: "t", tokenSecret: "ts" });
  });
  it("signs a deterministic OAuth GET without moving credentials into the URL", () => {
    const url = new URL(
      "https://api.x.com/2/users/12345/tweets?max_results=20&exclude=retweets",
    );
    const header = service.xAuthorization(
      url,
      {
        key: "key",
        secret: "secret",
        token: "token",
        tokenSecret: "token-secret",
      },
      "test-nonce",
      "1234567890",
    );
    // Independently computed HMAC-SHA1 fixture, not a real account credential.
    expect(header).toContain(
      'oauth_signature="bHUoscHymJ0wFjGjqNNwjgveqmA%3D"',
    );
    expect(header).toContain('oauth_nonce="test-nonce"');
    expect(url.href).not.toContain("secret");
    expect(service.xAuthorization(url, { bearer: "fixture" })).toBe(
      "Bearer fixture",
    );
  });
  it("binds cursors to a signing key, expiry, page limit, and a safe provider token", () => {
    const value = { token: "NEXT_token", page: 2, expires: 20000 };
    const cursor = service.signXCursor(value, "secret-fixture");
    expect(service.readXCursor(cursor, "secret-fixture", 10000)).toEqual(value);
    expect(() => service.readXCursor(cursor, "wrong-key", 10000)).toThrow(
      "invalid_cursor",
    );
    expect(() => service.readXCursor(cursor, "secret-fixture", 20000)).toThrow(
      "invalid_cursor",
    );
    expect(() =>
      service.readXCursor("a".repeat(2049), "secret-fixture"),
    ).toThrow("invalid_cursor");
    expect(() =>
      service.readXCursor(
        service.signXCursor({ ...value, page: 6 }, "key"),
        "key",
        10000,
      ),
    ).toThrow("invalid_cursor");
    expect(() =>
      service.readXCursor(
        service.signXCursor({ ...value, token: "https://evil.test/" }, "key"),
        "key",
        10000,
      ),
    ).toThrow("invalid_cursor");
  });
});
describe("fixed-account bounded read service", () => {
  it("deduplicates concurrent reads and reuses the first page cache", async () => {
    fetchMock
      .mockResolvedValueOnce(json(rawXProfile))
      .mockResolvedValueOnce(
        json({ data: [rawPost], meta: { next_token: "NEXT" } }),
      );
    const [a, b] = await Promise.all([service.getXFeed(), service.getXFeed()]);
    expect(a).toEqual(b);
    expect(a.posts[0].id).toBe("1001");
    expect(a.nextCursor).toBeTruthy();
    await service.getXFeed();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [profileUrl, postUrl] = fetchMock.mock.calls.map(
      ([url]) => url as URL,
    );
    expect(profileUrl.pathname).toBe("/2/users/by/username/AUnnippillil");
    expect(postUrl.pathname).toBe("/2/users/12345/tweets");
    expect(postUrl.searchParams.get("max_results")).toBe("20");
    expect(postUrl.searchParams.get("post.fields")).toContain("note_post");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      cache: "no-store",
    });
    expect(JSON.stringify(a)).not.toContain("test-bearer");
  });
  it("uses one legacy retry only after an explicit field validation rejection", async () => {
    fetchMock
      .mockResolvedValueOnce(json(rawXProfile))
      .mockResolvedValueOnce(
        json({ error: "Invalid post.fields: note_post" }, 400),
      )
      .mockResolvedValueOnce(json({ data: [rawPost] }));
    await service.getXFeed();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      (fetchMock.mock.calls[2][0] as URL).searchParams.get("tweet.fields"),
    ).toContain("referenced_tweets");
  });
  it.each([401, 403, 500])(
    "does not retry auth/provider errors (%i) or leak their bodies",
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(json(rawXProfile))
        .mockResolvedValueOnce(
          json({ error: "credential-leak-fixture post.fields" }, status),
        );
      await expect(service.getXFeed()).rejects.toMatchObject({
        code: "unavailable",
        message: "unavailable",
      });
      await expect(service.getXFeed()).rejects.toMatchObject({
        code: "unavailable",
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );
  it.each([402, 429])(
    "backs off from credit/rate failures (%i)",
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        json({ error: "private provider error" }, status, {
          "retry-after": "120",
        }),
      );
      await expect(service.getXFeed()).rejects.toMatchObject({
        code: "rate_limited",
        retryAfter: status === 402 ? 3600 : 120,
      });
      await expect(service.getXFeed()).rejects.toMatchObject({
        code: "rate_limited",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("returns configuration status without making any request for incomplete credentials", async () => {
    delete process.env.X_BEARER_TOKEN;
    delete process.env.TWITTER_BEARER_TOKEN;
    await expect(service.getXFeed()).rejects.toMatchObject({
      code: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects arbitrary unsigned cursors before a paid request", async () => {
    await expect(service.getXFeed("untrusted")).rejects.toMatchObject({
      code: "invalid_cursor",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never loads posts for a protected or wrong account", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { ...rawXProfile.data, protected: true } }),
    );
    await expect(service.getXFeed()).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("ends after five pages even if upstream tokens cycle", async () => {
    fetchMock.mockResolvedValueOnce(json(rawXProfile));
    for (let i = 0; i < 5; i++)
      fetchMock.mockResolvedValueOnce(
        json({
          data: [{ ...rawPost, id: String(1001 + i) }],
          meta: { next_token: i % 2 ? "A" : "B" },
        }),
      );
    let feed = await service.getXFeed();
    for (let i = 0; i < 4; i++) {
      expect(feed.nextCursor).toBeTruthy();
      feed = await service.getXFeed(feed.nextCursor);
    }
    expect(feed.nextCursor).toBeUndefined();
    expect(feed.limitReached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
  it("refreshes expired data and drops the old cache when the profile becomes private", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    fetchMock
      .mockResolvedValueOnce(json(rawXProfile))
      .mockResolvedValueOnce(json({ data: [rawPost] }))
      .mockResolvedValueOnce(
        json({ data: { ...rawXProfile.data, protected: true } }),
      );
    await service.getXFeed();
    jest.advanceTimersByTime(901000);
    await expect(service.getXFeed()).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("aborts a stalled provider request", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    );
    const pending = expect(service.getXFeed()).rejects.toMatchObject({
      code: "timeout",
    });
    await jest.advanceTimersByTimeAsync(8001);
    await pending;
  });
  it("handles empty timelines and malformed JSON differently", async () => {
    fetchMock
      .mockResolvedValueOnce(json(rawXProfile))
      .mockResolvedValueOnce(json({ meta: { result_count: 0 } }));
    expect((await service.getXFeed()).posts).toEqual([]);
    process.env.X_BEARER_TOKEN = "a-different-fixture";
    fetchMock.mockResolvedValueOnce(new Response("<html>Not JSON</html>"));
    await expect(service.getXFeed()).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
