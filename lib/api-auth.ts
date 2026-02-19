import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function resolveApiAuthSecret(): string | null {
  const secret = process.env.API_AUTH_TOKEN || process.env.ADMIN_READ_KEY;
  return secret && secret.trim().length > 0 ? secret.trim() : null;
}

function extractAuthToken(headers: Record<string, string | string[] | undefined>): string | null {
  const authorization = headers.authorization;
  const rawAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;
  if (rawAuthorization?.toLowerCase().startsWith('bearer ')) {
    return rawAuthorization.slice(7).trim();
  }

  const xApiKey = headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    return xApiKey.trim();
  }

  const xAdminKey = headers['x-admin-key'];
  if (typeof xAdminKey === 'string' && xAdminKey.trim()) {
    return xAdminKey.trim();
  }

  return null;
}

export function requireApiAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const secret = resolveApiAuthSecret();
  if (!secret) {
    res.status(503).json({ ok: false, error: 'API authentication not configured' });
    return false;
  }

  const token = extractAuthToken(req.headers);
  if (token !== secret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }

  return true;
}

export function requireAppRouteApiAuth(req: NextRequest): NextResponse | null {
  const secret = resolveApiAuthSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'API authentication not configured' },
      { status: 503 }
    );
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    || req.headers.get('x-api-key')?.trim()
    || req.headers.get('x-admin-key')?.trim()
    || null;

  if (token !== secret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
