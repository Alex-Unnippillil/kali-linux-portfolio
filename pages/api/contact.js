import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { getServiceSupabase } from '../../lib/supabase';
import { applyBackoff } from '../../utils/backoff';

export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_COOKIE = 'contactBackoff';

export default async function handler(req, res) {
  const missingRecaptchaSecret = !process.env.RECAPTCHA_SECRET;
  const missingRecaptchaSiteKey = !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const missingSupabase =
    !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (missingRecaptchaSecret || missingRecaptchaSiteKey || missingSupabase) {
    console.warn('Contact API running in demo mode', {
      missingRecaptchaSecret,
      missingRecaptchaSiteKey,
      missingSupabase,
    });
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

  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const allowed = applyBackoff(req, res, {
    name: RATE_LIMIT_COOKIE,
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
    secret: process.env.RATE_LIMIT_SECRET || '',
  });
  if (!allowed) {
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
  if (secret) {
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
  } else {
    console.warn('Contact submission accepted without reCAPTCHA verification', {
      ip,
    });
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
