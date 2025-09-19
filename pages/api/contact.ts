import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

import { loadServerEnv } from '../../env.server';
import { getServiceSupabase } from '../../lib/supabase';
import { contactSchema } from '../../utils/contactSchema';

export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

type ContactResponse = {
  ok: boolean;
  code?:
    | 'recaptcha_disabled'
    | 'rate_limit'
    | 'invalid_csrf'
    | 'invalid_recaptcha'
    | 'invalid_input';
  csrfToken?: string;
};

type RateLimitEntry = { count: number; start: number };

type ContactRequestBody = {
  recaptchaToken?: string;
  honeypot?: string;
  name?: string;
  email?: string;
  message?: string;
  [key: string]: unknown;
};

export const rateLimit = new Map<string, RateLimitEntry>();

function getRequestIp(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0] ?? '';
  }
  if (typeof forwarded === 'string') {
    return forwarded;
  }
  return req.socket.remoteAddress ?? '';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  const env = loadServerEnv(process.env, { fatalOnError: false });
  if (!env) {
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
  const now = Date.now();
  const entry = rateLimit.get(ip) ?? { count: 0, start: now };
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

  const { recaptchaToken = '', ...rest } = (req.body ?? {}) as ContactRequestBody;
  const secret = env.RECAPTCHA_SECRET;
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
    const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: String(secret ?? ''),
        response: String(recaptchaToken ?? ''),
      }),
    });
    const captcha = (await verify.json()) as { success?: boolean };
    if (!captcha.success) {
      console.warn('Contact submission rejected', {
        ip,
        reason: 'invalid_recaptcha',
      });
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    return;
  }

  let sanitized: { name: string; email: string; message: string };
  try {
    const parsed = contactSchema.parse({
      ...rest,
      csrfToken: csrfHeader,
      recaptchaToken,
    });
    if (parsed.honeypot) {
      console.warn('Contact submission rejected', { ip, reason: 'honeypot' });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }
    sanitized = {
      name: parsed.name,
      email: parsed.email,
      message: parsed.message,
    };
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
      console.warn('Supabase client not configured; contact message not stored', {
        ip,
      });
    }
  } catch {
    console.warn('Failed to store contact message', { ip });
  }

  res.status(200).json({ ok: true });
}
