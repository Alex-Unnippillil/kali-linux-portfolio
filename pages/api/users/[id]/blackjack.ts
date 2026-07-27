import type { NextApiRequest, NextApiResponse } from 'next';
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  rateLimit,
} from '../../contact';

type BlackjackResponse = {
  ok: boolean;
  code?:
    | 'method_not_allowed'
    | 'invalid_user'
    | 'missing_token'
    | 'invalid_token'
    | 'forbidden'
    | 'rate_limit';
};

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? '';
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket.remoteAddress ?? '';
}

function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse<BlackjackResponse>,
): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimit.get(ip) ?? { count: 0, start: now };

  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count += 1;
  rateLimit.set(ip, entry);

  for (const [key, value] of rateLimit.entries()) {
    if (now - value.start > RATE_LIMIT_WINDOW_MS) {
      rateLimit.delete(key);
    }
  }

  if (entry.count > RATE_LIMIT_MAX) {
    res
      .status(429)
      .json({ ok: false, code: 'rate_limit' });
    return true;
  }

  return false;
}

function extractBearerToken(req: NextApiRequest): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const auth = req.headers.authorization ?? headers['Authorization'];
  if (!auth) {
    return null;
  }

  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value || typeof value !== 'string') {
    return null;
  }

  const [scheme, token] = value.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function decodeJwtSubject(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1];
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const base64 =
      padding === 0 ? normalized : normalized.padEnd(normalized.length + 4 - padding, '=');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return typeof parsed.sub === 'string' ? parsed.sub : null;
  } catch {
    return null;
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlackjackResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  if (enforceRateLimit(req, res)) {
    return;
  }

  const userId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ ok: false, code: 'invalid_user' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, code: 'missing_token' });
    return;
  }

  const subject = decodeJwtSubject(token);
  if (!subject) {
    res.status(401).json({ ok: false, code: 'invalid_token' });
    return;
  }

  if (subject !== userId) {
    res.status(403).json({ ok: false, code: 'forbidden' });
    return;
  }

  res.status(200).json({ ok: true });
}

