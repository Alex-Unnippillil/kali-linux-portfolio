const RATE_LIMIT_STORE_SYMBOL = Symbol.for('kali.rateLimitEdgeStore');

type RateLimitEntry = {
  count: number;
  start: number;
};

type RateLimitEdgeOptions = {
  limit?: number;
  windowMs?: number;
  keyGenerator?: (req: unknown) => string;
  scopeGenerator?: (req: unknown) => string;
};

type RateLimitResult = {
  limited: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
};

type NodeResponseLike = {
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => NodeResponseLike;
  json: (data: unknown) => NodeResponseLike;
};

const globalObj = globalThis as typeof globalThis & {
  [RATE_LIMIT_STORE_SYMBOL]?: Map<string, RateLimitEntry>;
};

const store: Map<string, RateLimitEntry> =
  globalObj[RATE_LIMIT_STORE_SYMBOL] ?? new Map();

globalObj[RATE_LIMIT_STORE_SYMBOL] = store;

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

function pruneStore(now: number, windowMs: number) {
  for (const [key, entry] of store) {
    if (now - entry.start > windowMs) {
      store.delete(key);
    }
  }
}

function getHeader(req: any, name: string): string {
  const headers = req?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? '';
  }
  if (typeof headers === 'object') {
    const entries = Object.entries(headers);
    for (const [key, value] of entries) {
      if (key.toLowerCase() === name.toLowerCase()) {
        if (Array.isArray(value)) {
          return value[0] ?? '';
        }
        return value ?? '';
      }
    }
  }
  return '';
}

function defaultScope(req: any): string {
  if (req?.nextUrl?.pathname) {
    return req.nextUrl.pathname;
  }
  const rawUrl = req?.url;
  if (typeof rawUrl === 'string') {
    try {
      const url = new URL(rawUrl, 'http://localhost');
      return url.pathname;
    } catch {
      const [pathPart] = rawUrl.split('?');
      return pathPart || 'global';
    }
  }
  return 'global';
}

function defaultKey(req: any): string {
  const header =
    getHeader(req, 'x-forwarded-for') ||
    getHeader(req, 'x-real-ip') ||
    getHeader(req, 'cf-connecting-ip');
  if (header) {
    const [first] = String(header).split(',');
    if (first && first.trim()) {
      return first.trim();
    }
  }
  if (typeof req?.ip === 'string' && req.ip) {
    return req.ip;
  }
  const socket = req?.socket;
  if (socket && typeof socket.remoteAddress === 'string') {
    return socket.remoteAddress;
  }
  return 'anonymous';
}

function applyRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.start >= windowMs) {
    const fresh: RateLimitEntry = { count: 1, start: now };
    store.set(key, fresh);
    pruneStore(now, windowMs);
    const resetMs = fresh.start + windowMs;
    return {
      limited: false,
      limit,
      remaining: Math.max(0, limit - fresh.count),
      resetMs,
      retryAfterSeconds: Math.max(0, Math.ceil((resetMs - now) / 1000)),
    };
  }

  entry.count += 1;
  store.set(key, entry);
  pruneStore(now, windowMs);
  const resetMs = entry.start + windowMs;
  const limited = entry.count > limit;
  const remaining = limited ? 0 : Math.max(0, limit - entry.count);
  return {
    limited,
    limit,
    remaining,
    resetMs,
    retryAfterSeconds: Math.max(0, Math.ceil((resetMs - now) / 1000)),
  };
}

function setNodeHeaders(
  res: NodeResponseLike,
  result: RateLimitResult,
  limited: boolean,
) {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)));
    if (limited) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds || 0));
    }
  }
}

function applyEdgeHeaders(
  response: Response,
  result: RateLimitResult,
  limited: boolean,
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)));
  if (limited) {
    headers.set('Retry-After', String(result.retryAfterSeconds || 0));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearRateLimitEdgeStore() {
  store.clear();
}

export default function rateLimitEdge<Req = any, Res = any>(
  handler: (req: Req, res?: Res) => any,
  options: RateLimitEdgeOptions = {},
) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const keyGenerator = options.keyGenerator ?? defaultKey;
  const scopeGenerator = options.scopeGenerator ?? defaultScope;

  return async function rateLimitedHandler(req: Req, res?: Res) {
    const scope = scopeGenerator(req);
    const keyBase = keyGenerator(req);
    const key = `${scope}:${keyBase || 'anonymous'}`;
    const result = applyRateLimit(key, limit, windowMs);

    const isNodeResponse = res && typeof (res as any).status === 'function';

    if (isNodeResponse) {
      setNodeHeaders(res as unknown as NodeResponseLike, result, result.limited);
      if (result.limited) {
        (res as any)
          .status(429)
          .json({ error: 'rate_limit' });
        return;
      }
      return handler(req, res);
    }

    if (result.limited) {
      if (typeof Response === 'undefined') {
        return handler(req, res);
      }
      return new Response(JSON.stringify({ error: 'rate_limit' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
          'Retry-After': String(result.retryAfterSeconds || 0),
        },
      });
    }

    const response = await handler(req, res);
    if (typeof Response !== 'undefined' && response instanceof Response) {
      return applyEdgeHeaders(response, result, false);
    }
    return response;
  };
}
