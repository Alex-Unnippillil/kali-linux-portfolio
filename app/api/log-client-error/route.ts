import { NextRequest } from 'next/server';
import { sign, unsign } from '@tinyhttp/cookie-signature';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_COOKIE = 'logClientErrorBackoff';

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 1000);
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v)]),
    );
  }
  return value;
}

function applyBackoff(req: NextRequest) {
  const secret = process.env.RATE_LIMIT_SECRET || '';
  const raw = req.cookies.get(RATE_LIMIT_COOKIE)?.value;
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
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  const allowed = recent.length < RATE_LIMIT_MAX;
  if (allowed) recent.push(now);
  const value = sign(JSON.stringify(recent), secret);
  const cookie = `${RATE_LIMIT_COOKIE}=${encodeURIComponent(value)}; Max-Age=${Math.ceil(
    RATE_LIMIT_WINDOW_MS / 1000,
  )}; HttpOnly; Path=/; SameSite=Strict`;
  return { allowed, cookie };
}

export async function POST(req: NextRequest): Promise<Response> {
  const { allowed, cookie } = applyBackoff(req);
  const headers = { 'Set-Cookie': cookie };
  if (!allowed) {
    return Response.json({ ok: false, code: 'rate_limit' }, { status: 429, headers });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const sanitized = sanitize(body);
  console.error('Client error:', sanitized);
  return Response.json({ ok: true }, { headers });
}
