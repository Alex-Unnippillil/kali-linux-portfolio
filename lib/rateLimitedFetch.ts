let lastReq = 0;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function rateLimitedFetch<T>(
  url: string,
  options: { ttl?: number; retries?: number } = {},
): Promise<T> {
  const { ttl = 60_000, retries = 2 } = options;
  const key = `rlf:${url}`;
  const now = Date.now();
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const entry = JSON.parse(raw) as { ts: number; data: T };
        if (now - entry.ts < ttl) {
          return entry.data;
        }
      } catch {
        // ignore
      }
    }
  }

  const wait = 1100 - (now - lastReq);
  if (wait > 0) await sleep(wait);

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as T;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
        } catch {
          // ignore
        }
      }
      lastReq = Date.now();
      return data;
    } catch (e: unknown) {
      if (i === retries) throw e;
      await sleep(500 * (i + 1));
    }
  }

  throw new Error('Unreachable');
}

