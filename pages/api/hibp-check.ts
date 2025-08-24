import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { rateLimit } from '../../lib/rateLimiter';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!rateLimit(req, res)) return;

  const { password } = req.body as { password?: string };
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`
    );
    const text = await response.text();
    let count = 0;
    for (const line of text.split('\n')) {
      const [hashSuffix, cnt] = line.trim().split(':');
      if (hashSuffix === suffix) {
        count = parseInt(cnt, 10);
        break;
      }
    }
    return res.status(200).json({ prefix, count });
  } catch (error) {
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
