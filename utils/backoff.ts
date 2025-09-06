import type { NextApiRequest, NextApiResponse } from 'next';
import { sign, unsign } from '@tinyhttp/cookie-signature';

export interface BackoffOptions {
  name: string;
  limit: number;
  windowMs: number;
  secret: string;
}

function setCookie(
  res: NextApiResponse,
  name: string,
  timestamps: number[],
  secret: string,
  windowMs: number
) {
  const value = sign(JSON.stringify(timestamps), secret);
  const encoded = encodeURIComponent(value);
  const cookie = `${name}=${encoded}; Max-Age=${Math.ceil(
    windowMs / 1000
  )}; HttpOnly; Path=/; SameSite=Strict`;
  const prev = res.getHeader('Set-Cookie');
  if (prev) {
    if (Array.isArray(prev)) {
      res.setHeader('Set-Cookie', [...prev, cookie]);
    } else {
      res.setHeader('Set-Cookie', [prev.toString(), cookie]);
    }
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

export function applyBackoff(
  req: NextApiRequest,
  res: NextApiResponse,
  { name, limit, windowMs, secret }: BackoffOptions
): boolean {
  const raw = req.cookies?.[name];
  const now = Date.now();
  let timestamps: number[] = [];
  if (raw) {
    const unsigned = unsign(raw, secret);
    if (unsigned) {
      try {
        const arr = JSON.parse(unsigned);
        if (Array.isArray(arr)) {
          timestamps = arr
            .map((n: unknown) => parseInt(String(n), 10))
            .filter((n) => !Number.isNaN(n));
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  const recent = timestamps.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    setCookie(res, name, recent, secret, windowMs);
    return false;
  }
  recent.push(now);
  setCookie(res, name, recent, secret, windowMs);
  return true;
}

export function decodeBackoffCookie(value: string, secret: string): number[] {
  const unsigned = unsign(value, secret);
  if (!unsigned) return [];
  try {
    const arr = JSON.parse(unsigned);
    return Array.isArray(arr)
      ? arr
          .map((n: unknown) => parseInt(String(n), 10))
          .filter((n) => !Number.isNaN(n))
      : [];
  } catch {
    return [];
  }
}

