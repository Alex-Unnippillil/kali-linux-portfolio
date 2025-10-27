import { createHash, timingSafeEqual } from 'crypto';

export interface SlidingWindowRateLimiterOptions {
  windowMs: number;
  max: number;
  nowProvider?: () => number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export class SlidingWindowRateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly now: () => number;
  private readonly store = new Map<string, number[]>();

  constructor(options: SlidingWindowRateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.now = options.nowProvider ?? (() => Date.now());
  }

  attempt(key: string): RateLimitResult {
    const id = key || 'anonymous';
    const now = this.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.store.get(id) ?? [];
    const recent = timestamps.filter((ts) => ts > windowStart);

    if (recent.length >= this.max) {
      const resetAt = recent[0] + this.windowMs;
      const retryAfter = Math.max(0, Math.ceil((resetAt - now) / 1000));
      this.store.set(id, recent);
      this.prune(windowStart);
      return {
        success: false,
        limit: this.max,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    recent.push(now);
    this.store.set(id, recent);
    this.prune(windowStart);

    const resetAt = recent[0] + this.windowMs;
    const remaining = Math.max(0, this.max - recent.length);

    return {
      success: true,
      limit: this.max,
      remaining,
      resetAt,
    };
  }

  clear(key?: string) {
    if (key) {
      this.store.delete(key || 'anonymous');
    } else {
      this.store.clear();
    }
  }

  private prune(windowStart: number) {
    for (const [key, timestamps] of this.store) {
      const recent = timestamps.filter((ts) => ts > windowStart);
      if (recent.length === 0) {
        this.store.delete(key);
      } else if (recent.length !== timestamps.length) {
        this.store.set(key, recent);
      }
    }
  }
}

export function isBypassTokenValid(
  provided: string | string[] | undefined,
  expected: string | undefined,
): boolean {
  if (!expected || typeof provided !== 'string') {
    return false;
  }

  try {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function hashIdentifier(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
