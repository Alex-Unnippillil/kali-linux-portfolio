import { LRUCache } from 'lru-cache';
import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import { formatCookie } from '../../utils/cookies';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_CACHE_SIZE = 500;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const RATE_LIMIT_WINDOW_MS = toPositiveInteger(
  process.env.CONTACT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS
);

export const RATE_LIMIT_MAX = toPositiveInteger(
  process.env.CONTACT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_MAX
);

export const RATE_LIMIT_CACHE_SIZE = toPositiveInteger(
  process.env.CONTACT_RATE_LIMIT_CACHE_SIZE,
  DEFAULT_RATE_LIMIT_CACHE_SIZE
);

export const rateLimit = new LRUCache({
  max: RATE_LIMIT_CACHE_SIZE,
  ttl: RATE_LIMIT_WINDOW_MS,
  ttlAutopurge: true,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

const logRejection = (ip, reason, extra = {}) => {
  console.warn('Contact submission rejected', {
    ip,
    reason,
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
    ...extra,
  });
};

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
    res.status(200).json({ ok: true, csrfToken: token });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const existing = rateLimit.get(ip) || { count: 0 };
  const nextCount = existing.count + 1;
  rateLimit.set(ip, { count: nextCount });
  if (nextCount > RATE_LIMIT_MAX) {
    logRejection(ip, 'rate_limit', { count: nextCount });
    res.status(429).json({ ok: false, code: 'rate_limit' });
    return;
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    logRejection(ip, 'invalid_csrf');
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    return;
  }

  const { recaptchaToken = '', ...rest } = req.body || {};
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    logRejection(ip, 'recaptcha_disabled');
    res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
    return;
  }
  if (!recaptchaToken) {
    logRejection(ip, 'invalid_recaptcha');
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
      logRejection(ip, 'invalid_recaptcha');
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } catch {
    logRejection(ip, 'invalid_recaptcha');
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    return;
  }

  let sanitized;
  try {
    const parsed = contactSchema.parse({ ...rest, csrfToken: csrfHeader, recaptchaToken });
    if (parsed.honeypot) {
      logRejection(ip, 'honeypot');
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }
    sanitized = { name: parsed.name, email: parsed.email, message: parsed.message };
  } catch {
    logRejection(ip, 'invalid_input');
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
