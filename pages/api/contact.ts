import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import {
  ContactResponseData,
  createContactResponse,
  parseContactSubmitRequest,
} from '../../lib/contracts';

// Simple in-memory rate limiter. Not suitable for distributed environments.
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

interface RateLimitEntry {
  count: number;
  start: number;
}

export const rateLimit = new Map<string, RateLimitEntry>();

function respond(res: NextApiResponse, status: number, data: ContactResponseData) {
  res.status(status).json(createContactResponse(data));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    validateServerEnv(process.env);
  } catch {
    if (!process.env.RECAPTCHA_SECRET) {
      respond(res, 503, { ok: false, code: 'recaptcha_disabled' });
    } else {
      respond(res, 500, { ok: false });
    }
    return;
  }

  if (req.method === 'GET') {
    const token = randomBytes(32).toString('hex');
    res.setHeader(
      'Set-Cookie',
      `csrfToken=${token}; HttpOnly; Path=/; SameSite=Strict`,
    );
    respond(res, 200, { ok: true, csrfToken: token });
    return;
  }

  if (req.method !== 'POST') {
    respond(res, 405, { ok: false });
    return;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
    req.socket.remoteAddress ||
    '';
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
    respond(res, 429, { ok: false, code: 'rate_limit' });
    return;
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_csrf' });
    respond(res, 403, { ok: false, code: 'invalid_csrf' });
    return;
  }

  let parsedBody;
  try {
    parsedBody = parseContactSubmitRequest(req.body);
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
    respond(res, 400, { ok: false, code: 'invalid_input' });
    return;
  }

  const { recaptchaToken = '', ...rest } = parsedBody;
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.warn('Contact submission rejected', {
      ip,
      reason: 'recaptcha_disabled',
    });
    respond(res, 503, { ok: false, code: 'recaptcha_disabled' });
    return;
  }
  if (!recaptchaToken) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    respond(res, 400, { ok: false, code: 'invalid_recaptcha' });
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
      },
    );
    const captcha = (await verify.json()) as { success?: boolean };
    if (!captcha.success) {
      console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
      respond(res, 400, { ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    respond(res, 400, { ok: false, code: 'invalid_recaptcha' });
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
      respond(res, 400, { ok: false, code: 'invalid_input' });
      return;
    }
    sanitized = {
      name: parsed.name,
      email: parsed.email,
      message: parsed.message,
    };
  } catch {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
    respond(res, 400, { ok: false, code: 'invalid_input' });
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

  respond(res, 200, { ok: true });
}
