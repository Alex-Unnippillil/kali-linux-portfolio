import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import logger from '../../utils/logger';

// Simple in-memory rate limiter. Not suitable for distributed environments.
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

export const rateLimit = new Map();

const contactLogger = logger.createApiLogger('contact');

export default async function handler(req, res) {
  const completeRequest = contactLogger.startTimer({ method: req.method });
  try {
    validateServerEnv(process.env);
  } catch {
    if (!process.env.RECAPTCHA_SECRET) {
      res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
      completeRequest({ status: 503, code: 'recaptcha_disabled' });
    } else {
      res.status(500).json({ ok: false });
      completeRequest({ status: 500, code: 'validate_env_failed' });
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
    completeRequest({ status: 200, action: 'csrf_issued' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    completeRequest({ status: 405, code: 'method_not_allowed' });
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
    contactLogger.rateLimit('Contact submission rejected', { ip, reason: 'rate_limit' });
    res.status(429).json({ ok: false, code: 'rate_limit' });
    completeRequest({ status: 429, code: 'rate_limit', ip });
    return;
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    contactLogger.warn('Contact submission rejected', { ip, reason: 'invalid_csrf' });
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    completeRequest({ status: 403, code: 'invalid_csrf', ip });
    return;
  }

  const { recaptchaToken = '', ...rest } = req.body || {};
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    contactLogger.warn('Contact submission rejected', { ip, reason: 'recaptcha_disabled' });
    res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
    completeRequest({ status: 503, code: 'recaptcha_disabled', ip });
    return;
  }
  if (!recaptchaToken) {
    contactLogger.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    completeRequest({ status: 400, code: 'invalid_recaptcha', ip });
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
      contactLogger.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      completeRequest({ status: 400, code: 'invalid_recaptcha', ip });
      return;
    }
  } catch {
    contactLogger.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    completeRequest({ status: 400, code: 'invalid_recaptcha', ip });
    return;
  }

  let sanitized;
  try {
    const parsed = contactSchema.parse({ ...rest, csrfToken: csrfHeader, recaptchaToken });
    if (parsed.honeypot) {
      contactLogger.warn('Contact submission rejected', { ip, reason: 'honeypot' });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      completeRequest({ status: 400, code: 'invalid_input', ip, reason: 'honeypot' });
      return;
    }
    sanitized = { name: parsed.name, email: parsed.email, message: parsed.message };
  } catch {
    contactLogger.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
    res.status(400).json({ ok: false, code: 'invalid_input' });
    completeRequest({ status: 400, code: 'invalid_input', ip });
    return;
  }

  try {
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from('contact_messages').insert([sanitized]);
    } else {
      contactLogger.warn('Supabase client not configured; contact message not stored', { ip });
    }
  } catch {
    contactLogger.warn('Failed to store contact message', { ip });
  }


  res.status(200).json({ ok: true });
  completeRequest({ status: 200, ip });
}
