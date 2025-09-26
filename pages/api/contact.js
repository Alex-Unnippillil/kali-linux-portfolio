import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../utils/rateLimiter';

// Simple in-memory rate limiter. Not suitable for distributed environments.
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

export const contactRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
});

export default async function handler(req, res) {
  try {
    validateServerEnv(process.env);
  } catch {
    if (!process.env.RECAPTCHA_SECRET) {
      res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
    } else {
      res.status(500).json({ ok: false });
    }

    return;
  }
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

  const ip = getRequestIp(req);
  const rate = contactRateLimiter.check(ip);
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
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
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.warn('Contact submission rejected', { ip, reason: 'recaptcha_disabled' });
    res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
    return;
  }
  if (!recaptchaToken) {
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
          secret: String(secret ?? ''),
          response: String(recaptchaToken ?? ''),
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

  let sanitized;
  try {
    const parsed = contactSchema.parse({ ...rest, csrfToken: csrfHeader, recaptchaToken });
    if (parsed.honeypot) {
      console.warn('Contact submission rejected', { ip, reason: 'honeypot' });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }
    sanitized = { name: parsed.name, email: parsed.email, message: parsed.message };
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  try {
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from('contact_messages').insert([sanitized]);
    } else {
      console.warn('Supabase client not configured; contact message not stored', { ip });
    }
  } catch {
    console.warn('Failed to store contact message', { ip });
  }


  res.status(200).json({ ok: true });
}
