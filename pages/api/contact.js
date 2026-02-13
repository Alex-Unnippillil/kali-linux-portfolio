import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import { formatCookie } from '../../utils/cookies';

// Simple in-memory rate limiter. Not suitable for distributed environments.
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 5;

export const rateLimit = new Map();

export default async function handler(req, res) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  try {
    validateServerEnv(process.env);
  } catch {
    if (!demoMode) {
      if (!process.env.RECAPTCHA_SECRET) {
        res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
      } else {
        res.status(500).json({ ok: false });
      }

      return;
    }
  }
  if (req.method === 'GET') {
    const token = randomBytes(32).toString('hex');
    const shouldUseSecure =
      req.headers['x-forwarded-proto'] === 'https' ||
      process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      formatCookie('csrfToken', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'Strict',
        secure: shouldUseSecure,
      })
    );
    res.status(200).json({ ok: true, csrfToken: token, demo: demoMode });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
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
  if (!demoMode) {
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
    } else if (demoMode) {
      console.info('Contact submission (demo)', { ip, ...sanitized });
    } else {
      console.warn('Supabase client not configured; contact message not stored', { ip });
    }
  } catch {
    console.warn('Failed to store contact message', { ip });
  }


  res.status(200).json({ ok: true, demo: demoMode });
}
