import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range/';
export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 1024;

function getPasswordFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const value = (body as Record<string, unknown>).password;
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.normalize('NFKC');
  if (normalized.length < MIN_PASSWORD_LENGTH || normalized.length > MAX_PASSWORD_LENGTH) {
    return null;
  }
  return normalized;
}

async function lookupPassword(hashSuffix: string, hashPrefix: string) {
  const response = await fetch(`${HIBP_ENDPOINT}${hashPrefix}`, {
    method: 'GET',
    headers: {
      'Add-Padding': 'true',
    },
  });

  if (response.status === 429) {
    return { ok: false as const, status: 429 };
  }

  if (!response.ok) {
    return { ok: false as const, status: 502 };
  }

  const payload = await response.text();
  const lines = payload.split('\n');
  const match = lines
    .map((line) => line.trim())
    .find((line) => line.toUpperCase().startsWith(`${hashSuffix}:`));

  const count = match ? Number.parseInt(match.split(':')[1] ?? '0', 10) || 0 : 0;

  return { ok: true as const, count };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false });
    return;
  }

  const password = getPasswordFromBody(req.body);
  if (!password) {
    res.status(400).json({ ok: false, code: 'invalid_password' });
    return;
  }

  const hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const hashPrefix = hash.slice(0, 5);
  const hashSuffix = hash.slice(5);

  try {
    const result = await lookupPassword(hashSuffix, hashPrefix);

    if (!result.ok) {
      if (result.status === 429) {
        res.status(429).json({ ok: false, code: 'hibp_throttled' });
        return;
      }
      res.status(502).json({ ok: false, code: 'hibp_unavailable' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, count: result.count, breached: result.count > 0 });
  } catch (error) {
    console.error('hibp lookup failed', error);
    res.status(502).json({ ok: false, code: 'hibp_unavailable' });
  }
}
