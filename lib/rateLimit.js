export const DEFAULT_WINDOW_MS = 60_000;
export const DEFAULT_MAX_REQUESTS = 10;

export const rateLimitStore = new Map();

export const getHeaderValue = (headers, key) => {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(key) || '';
  }
  const value = headers[key] || headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
};

export const normalizeIdentifier = (req) => {
  const forwarded = getHeaderValue(req?.headers, 'x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (typeof req?.ip === 'string' && req.ip) {
    return req.ip;
  }
  if (req?.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return 'anonymous';
};

const pruneStore = (store, now, windowMs) => {
  for (const [key, value] of store.entries()) {
    if (now - value.start > windowMs) {
      store.delete(key);
    }
  }
};

export const checkRateLimit = (
  identifier,
  { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_REQUESTS } = {},
  store = rateLimitStore
) => {
  const now = Date.now();
  const entry = store.get(identifier) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  store.set(identifier, entry);
  pruneStore(store, now, windowMs);
  const allowed = entry.count <= max;
  const remaining = Math.max(0, max - entry.count);
  const reset = entry.start + windowMs;
  return { allowed, remaining, reset };
};
