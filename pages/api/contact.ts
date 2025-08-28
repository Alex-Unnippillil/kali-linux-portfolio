import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';

// Simple in-memory rate limiter. Not suitable for distributed environments.
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

export const rateLimit = new Map<string, { count: number; start: number }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = randomBytes(32).toString('hex');
    res.setHeader(
      'Set-Cookie',
      `csrfToken=${token}; HttpOnly; Path=/; SameSite=Strict`
    );
    res.status(200).json({ ok: true, csrfToken: token });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimit.set(ip, entry);
  for (const [key, value] of rateLimit) {
    if (now - value.start > RATE_LIMIT_WINDOW_MS) {
      rateLimit.delete(key);
    }
  }
  if (entry.count > RATE_LIMIT_MAX) {
    console.warn('Contact submission rejected', { ip, reason: 'rate_limit' });
    res.status(429).json({ ok: false, code: 'rate_limit' });
    return;
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_csrf' });
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    return;
  }

  const { recaptchaToken = '', ...rest } = req.body || {};
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!recaptchaToken || !secret) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    return;
  }
  try {
    const verify = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret,
          response: recaptchaToken,
        }),
      }
    );
    const captcha = await verify.json();
    if (!captcha.success) {
      console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    return;
  }

  try {
    const parsed = contactSchema.parse({ ...rest, csrfToken: csrfHeader, recaptchaToken });
    if (parsed.honeypot) {
      console.warn('Contact submission rejected', { ip, reason: 'honeypot' });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  res.status(200).json({ ok: true });
}
