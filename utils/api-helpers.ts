import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;
const buckets = new Map<string, { count: number; start: number }>();

function getClientId(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  if (Array.isArray(xf)) return xf[0];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0]?.trim() ?? '';
  const addr = (req.socket as any)?.remoteAddress;
  return typeof addr === 'string' ? addr : '';
}

export function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { windowMs?: number; max?: number },
): boolean {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_MAX;
  const id = getClientId(req) || 'anonymous';
  const now = Date.now();
  const entry = buckets.get(id) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  buckets.set(id, entry);

  for (const [key, value] of buckets) {
    if (now - value.start > windowMs) {
      buckets.delete(key);
    }
  }

  if (entry.count > max) {
    sendError(res, 429, 'rate_limit', 'Too many requests');
    return true;
  }
  return false;
}

export function sendError(
  res: NextApiResponse,
  status: number,
  code: string,
  message?: string,
  details?: Record<string, unknown>,
) {
  res.status(status).json({ ok: false, code, message, ...(details ? { details } : {}) });
}

export function sendMethodNotAllowed(
  req: NextApiRequest,
  res: NextApiResponse,
  allow: string[],
) {
  res.setHeader('Allow', allow);
  sendError(res, 405, 'method_not_allowed', `Method ${req.method} not allowed`);
}

export function parseString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value[0]?.trim() ?? null;
  return null;
}

export function parseNumber(value: unknown): number | null {
  const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(num)) return null;
  return num;
}
