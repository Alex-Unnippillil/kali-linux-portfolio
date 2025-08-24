import type { NextApiRequest, NextApiResponse } from 'next';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;

interface RateLimiterBackend {
  increment(key: string, limit: number): Promise<{ allowed: boolean; remaining: number; reset: number }>;
}

type Entry = { count: number; expires: number };

class MemoryBackend implements RateLimiterBackend {
  private map = new Map<string, Entry>();
  async increment(key: string, limit: number) {
    const now = Date.now();
    let entry = this.map.get(key);
    if (!entry || entry.expires <= now) {
      entry = { count: 0, expires: now + WINDOW_MS };
    }
    entry.count += 1;
    this.map.set(key, entry);
    const remaining = limit - entry.count;
    return {
      allowed: entry.count <= limit,
      remaining,
      reset: Math.ceil((entry.expires - now) / 1000),
    };
  }
}

class UpstashBackend implements RateLimiterBackend {
  private url = process.env.UPSTASH_REDIS_REST_URL!;
  private token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  async increment(key: string, limit: number) {
    const script =
      'local c = redis.call("incr", KEYS[1])\n' +
      'if c == 1 then redis.call("pexpire", KEYS[1], ARGV[1]) end\n' +
      'return {c, redis.call("pttl", KEYS[1])}';
    const res = await fetch(`${this.url}/eval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script,
        keys: [`rl:${key}`],
        argv: [WINDOW_MS],
      }),
    });
    const data = (await res.json()) as { result: [number, number] };
    const [count, ttl] = data.result;
    const remaining = limit - count;
    return {
      allowed: count <= limit,
      remaining,
      reset: Math.ceil(ttl / 1000),
    };
  }
}

const backend: RateLimiterBackend =
  process.env.RATE_LIMITER_BACKEND === 'upstash'
    ? new UpstashBackend()
    : new MemoryBackend();

function getKey(req: NextApiRequest | Request): string {
  const headers = req instanceof Request ? req.headers : (req.headers as any);
  const xf = headers.get
    ? headers.get('x-forwarded-for')
    : (headers['x-forwarded-for'] as string);
  const ip = xf
    ? xf.split(',')[0].trim()
    : req instanceof Request
      ? undefined
      : req.socket.remoteAddress;
  return ip || 'unknown';
}

async function checkLimit(key: string, limit: number) {
  return backend.increment(key, limit);
}

export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limit = MAX_REQUESTS
) {
  const key = getKey(req);
  const { allowed, remaining, reset } = await checkLimit(key, limit);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  if (!allowed) {
    res.setHeader('Retry-After', String(reset));
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
}

export async function rateLimitEdge(req: Request, limit = MAX_REQUESTS) {
  const key = getKey(req);
  const { allowed, remaining, reset } = await checkLimit(key, limit);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  };
  if (!allowed) {
    headers['Retry-After'] = String(reset);
    return { limited: true, headers } as const;
  }
  return { limited: false, headers } as const;
}
