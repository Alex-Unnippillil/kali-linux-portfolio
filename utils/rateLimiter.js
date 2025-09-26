const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;

function cleanupStore(store, windowMs, now) {
  for (const [key, entry] of store) {
    if (now - entry.start >= windowMs) {
      store.delete(key);
    }
  }
}

export function createRateLimiter(options = {}) {
  const { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = options;
  const store = new Map();

  return {
    check(key) {
      const now = Date.now();
      cleanupStore(store, windowMs, now);

      const entry = store.get(key) || { count: 0, start: now };
      if (now - entry.start >= windowMs) {
        entry.count = 0;
        entry.start = now;
      }

      entry.count += 1;
      store.set(key, entry);

      const limited = entry.count > max;
      const remaining = limited ? 0 : Math.max(0, max - entry.count);
      const reset = entry.start + windowMs;
      const retryAfter = limited
        ? Math.max(1, Math.ceil((reset - now) / 1000))
        : 0;

      return {
        ok: !limited,
        limit: max,
        remaining,
        reset,
        retryAfter,
      };
    },
    reset() {
      store.clear();
    },
    has(key) {
      return store.has(key);
    },
  };
}

export function getRequestIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

export function setRateLimitHeaders(res, result) {
  if (typeof res.setHeader !== 'function') {
    return;
  }
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.reset / 1000)));
  if (!result.ok && result.retryAfter > 0) {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
}

