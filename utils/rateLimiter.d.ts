import type { NextApiRequest, NextApiResponse } from 'next';

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
  has(key: string): boolean;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export function createRateLimiter(options?: RateLimitOptions): RateLimiter;

export function getRequestIp(
  req: Pick<NextApiRequest, 'headers' | 'socket'>,
): string;

export function setRateLimitHeaders(
  res: { setHeader?: NextApiResponse['setHeader'] },
  result: RateLimitResult,
): void;

