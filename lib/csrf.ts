import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const COOKIE_NAME = 'csrfToken';

export function generateCsrfToken(res: NextApiResponse): string {
  const token = randomBytes(32).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict`
  );
  return token;
}

export function validateCsrfToken(req: NextApiRequest): boolean {
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies?.[COOKIE_NAME];
  return typeof header === 'string' && typeof cookie === 'string' && header === cookie;
}
