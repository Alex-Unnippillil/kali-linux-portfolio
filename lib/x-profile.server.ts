// Imported only by pages/api/x/profile. Never import this module from a component.
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  X_HANDLE,
  normalizeXPosts,
  normalizeXProfile,
  type XFeed,
  type XProfile,
  type FeedIssue,
} from "../utils/x-profile";

const API_ORIGIN = "https://api.x.com";
export const X_CACHE_SECONDS = 900;
const MAX_PAGES = 5;
const REQUEST_TIMEOUT = 8000;
type Credentials =
  | { bearer: string }
  | { key: string; secret: string; token: string; tokenSecret: string };
export class XFeedError extends Error {
  constructor(
    public code: FeedIssue,
    public retryAfter = 60,
  ) {
    super(code);
  }
}
class UpstreamError extends Error {
  constructor(
    public status: number,
    public retryAfter = 60,
    public invalidFields = false,
  ) {
    super("X API request failed");
  }
}
export function xCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Credentials | null {
  if (env.X_FEED_ENABLED === "false") return null;
  const bearer = (env.X_BEARER_TOKEN || env.TWITTER_BEARER_TOKEN || "").trim();
  if (bearer) return { bearer };
  const key = (env.X_API_KEY || env.TWITTER_API_KEY || "").trim();
  const secret = (env.X_API_SECRET || env.TWITTER_API_SECRET || "").trim();
  const token = (env.X_ACCESS_TOKEN || env.TWITTER_ACCESS_TOKEN || "").trim();
  const tokenSecret = (
    env.X_ACCESS_TOKEN_SECRET ||
    env.TWITTER_ACCESS_TOKEN_SECRET ||
    ""
  ).trim();
  return key && secret && token && tokenSecret
    ? { key, secret, token, tokenSecret }
    : null;
}
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
export function xAuthorization(
  url: URL,
  credentials: Credentials,
  nonce = randomBytes(16).toString("hex"),
  timestamp = Math.floor(Date.now() / 1000).toString(),
): string {
  if ("bearer" in credentials) return `Bearer ${credentials.bearer}`;
  const oauth: Record<string, string> = {
    oauth_consumer_key: credentials.key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.token,
    oauth_version: "1.0",
  };
  const parameters = [
    ...url.searchParams.entries(),
    ...Object.entries(oauth),
  ].map(([k, v]) => [encode(k), encode(v)]);
  parameters.sort(([a, av], [b, bv]) =>
    a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1,
  );
  const base = [
    "GET",
    encode(`${url.origin}${url.pathname}`),
    encode(parameters.map((pair) => pair.join("=")).join("&")),
  ].join("&");
  oauth.oauth_signature = createHmac(
    "sha1",
    `${encode(credentials.secret)}&${encode(credentials.tokenSecret)}`,
  )
    .update(base)
    .digest("base64");
  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${encode(key)}="${encode(oauth[key])}"`)
    .join(", ")}`;
}
const credentialKey = (credentials: Credentials) =>
  createHash("sha256")
    .update("x-profile-cache-v1\0")
    .update(JSON.stringify(credentials))
    .digest("hex");

type Cursor = { token: string; page: number; expires: number };
export function signXCursor(cursor: Cursor, key: string): string {
  const body = Buffer.from(JSON.stringify(cursor)).toString("base64url");
  return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}
export function readXCursor(
  value: string,
  key: string,
  now = Date.now(),
): Cursor {
  if (value.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value))
    throw new XFeedError("invalid_cursor");
  const [body, mac] = value.split(".");
  const expected = createHmac("sha256", key).update(body).digest();
  const actual = Buffer.from(mac, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new XFeedError("invalid_cursor");
  try {
    const cursor: Cursor = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    );
    if (
      typeof cursor.token !== "string" ||
      !/^[A-Za-z0-9_-]{1,512}$/.test(cursor.token) ||
      !Number.isInteger(cursor.page) ||
      cursor.page < 2 ||
      cursor.page > MAX_PAGES ||
      !Number.isFinite(cursor.expires) ||
      cursor.expires <= now
    )
      throw new Error();
    return cursor;
  } catch {
    throw new XFeedError("invalid_cursor");
  }
}

async function getJson(
  url: URL,
  credentials: Credentials,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: xAuthorization(url, credentials),
        Accept: "application/json",
      },
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });
    // Never forward upstream bodies, headers or credential errors to visitors/logs.
    if (Number(response.headers.get("content-length")) > 2_000_000)
      throw new XFeedError("unavailable");
    const reader = response.body?.getReader();
    let raw = "";
    if (reader) {
      let bytes = 0;
      const decoder = new TextDecoder();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2_000_000) {
          await reader.cancel();
          throw new XFeedError("unavailable");
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    } else {
      raw = await response.text();
    }
    if (raw.length > 2_000_000) throw new XFeedError("unavailable");
    if (!response.ok) {
      const reset = Number(response.headers.get("x-rate-limit-reset")) * 1000;
      const wait = Math.ceil((reset - Date.now()) / 1000);
      const retry =
        Number(response.headers.get("retry-after")) || (wait > 0 ? wait : 900);
      throw new UpstreamError(
        response.status,
        Math.max(60, Math.min(3600, retry)),
        response.status === 400 &&
          /post\.fields|note_post|referenced_posts/.test(raw),
      );
    }
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new XFeedError("unavailable");
    return body as Record<string, unknown>;
  } catch (error) {
    if (controller.signal.aborted) throw new XFeedError("timeout");
    if (error instanceof XFeedError || error instanceof UpstreamError)
      throw error;
    throw new XFeedError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

type Entry = { expires: number; value: XFeed };
// Bounded warm-instance cache and in-flight deduplication complement the CDN.
const pages = new Map<string, Entry>();
const inFlight = new Map<string, Promise<XFeed>>();
let identity = "";
let profileCache: { profile: XProfile; expires: number } | undefined;
let profileRequest: Promise<XProfile> | undefined;
let cooldown: { until: number; error: XFeedError } | undefined;
let fieldStyle: "post" | "tweet" = "post";

async function loadProfile(credentials: Credentials): Promise<XProfile> {
  if (profileCache && profileCache.expires > Date.now())
    return profileCache.profile;
  if (profileRequest) return profileRequest;
  profileRequest = (async () => {
    const url = new URL(`/2/users/by/username/${X_HANDLE}`, API_ORIGIN);
    url.searchParams.set(
      "user.fields",
      "id,name,username,description,profile_image_url,profile_banner_url,protected,public_metrics,url,entities,created_at,location,withheld",
    );
    const profile = normalizeXProfile(await getJson(url, credentials));
    if (!profile) throw new XFeedError("unavailable", X_CACHE_SECONDS);
    profileCache = { profile, expires: Date.now() + X_CACHE_SECONDS * 1000 };
    return profile;
  })();
  try {
    return await profileRequest;
  } finally {
    profileRequest = undefined;
  }
}

export async function getXFeed(cursorValue?: string): Promise<XFeed> {
  const credentials = xCredentials();
  if (!credentials) throw new XFeedError("not_configured", 60);
  const key = credentialKey(credentials);
  const currentIdentity = `${key}:${process.env.X_API_FIELD_STYLE || "auto"}`;
  if (identity !== currentIdentity) {
    identity = currentIdentity;
    pages.clear();
    inFlight.clear();
    profileCache = undefined;
    profileRequest = undefined;
    cooldown = undefined;
    fieldStyle = process.env.X_API_FIELD_STYLE === "tweet" ? "tweet" : "post";
  }
  const cursor = cursorValue ? readXCursor(cursorValue, key) : undefined;
  const cacheKey = cursor ? `${cursor.page}:${cursor.token}` : "first";
  if (cooldown && cooldown.until > Date.now())
    throw new XFeedError(
      cooldown.error.code,
      Math.ceil((cooldown.until - Date.now()) / 1000),
    );
  const cached = pages.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;
  if (inFlight.size >= 3) throw new XFeedError("rate_limited", 60);
  const request = (async () => {
    try {
      const profile = await loadProfile(credentials);
      const makeUrl = () => {
        const url = new URL(`/2/users/${profile.id}/tweets`, API_ORIGIN);
        url.searchParams.set("max_results", "20");
        url.searchParams.set("exclude", "retweets");
        if (cursor) url.searchParams.set("pagination_token", cursor.token);
        url.searchParams.set(
          `${fieldStyle}.fields`,
          fieldStyle === "post"
            ? "attachments,created_at,entities,note_post,possibly_sensitive,public_metrics,withheld"
            : "author_id,attachments,created_at,entities,note_tweet,possibly_sensitive,public_metrics,referenced_tweets,withheld",
        );
        url.searchParams.set(
          "expansions",
          fieldStyle === "post"
            ? "author_id,attachments.media_keys,referenced_posts"
            : "author_id,attachments.media_keys",
        );
        url.searchParams.set(
          "media.fields",
          "media_key,type,url,preview_image_url,alt_text",
        );
        return url;
      };
      let payload: Record<string, unknown>;
      try {
        payload = await getJson(makeUrl(), credentials);
      } catch (error) {
        // X's endpoint reference and older data dictionary use different names.
        // Only an explicit field-validation rejection allows one legacy retry.
        if (
          !(error instanceof UpstreamError) ||
          !error.invalidFields ||
          fieldStyle !== "post" ||
          process.env.X_API_FIELD_STYLE === "post"
        )
          throw error;
        fieldStyle = "tweet";
        payload = await getJson(makeUrl(), credentials);
      }
      const meta =
        payload.meta && typeof payload.meta === "object"
          ? (payload.meta as Record<string, unknown>)
          : {};
      if (
        !Array.isArray(payload.data) &&
        !(payload.data === undefined && meta.result_count === 0)
      )
        throw new XFeedError("unavailable");
      const token =
        typeof meta.next_token === "string" &&
        /^[A-Za-z0-9_-]{1,512}$/.test(meta.next_token)
          ? meta.next_token
          : undefined;
      const page = cursor?.page || 1;
      const hasNext = Boolean(token && token !== cursor?.token);
      const value: XFeed = {
        profile,
        posts: normalizeXPosts(payload, profile.id),
        fetchedAt: new Date().toISOString(),
        nextCursor:
          hasNext && page < MAX_PAGES
            ? signXCursor(
                {
                  token: token!,
                  page: page + 1,
                  expires: Date.now() + 3_600_000,
                },
                key,
              )
            : undefined,
        limitReached: hasNext && page >= MAX_PAGES,
      };
      if (pages.size >= 32) pages.delete(pages.keys().next().value!);
      pages.set(cacheKey, {
        expires: Date.now() + X_CACHE_SECONDS * 1000,
        value,
      });
      return value;
    } catch (error) {
      let failure: XFeedError;
      if (error instanceof UpstreamError) {
        failure = new XFeedError(
          [402, 429].includes(error.status) ? "rate_limited" : "unavailable",
          error.status === 402 ? 3600 : error.retryAfter,
        );
      } else {
        failure =
          error instanceof XFeedError ? error : new XFeedError("unavailable");
      }
      // Don't serve stale deleted/protected content after a provider failure.
      pages.clear();
      profileCache = undefined;
      cooldown = {
        until: Date.now() + failure.retryAfter * 1000,
        error: failure,
      };
      throw failure;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, request);
  return request;
}
