import { randomBytes } from 'crypto';

import { contactSchema } from '@/utils/contactSchema';
import { validateServerEnv } from '@/lib/validate';
import { getServiceSupabase } from '@/lib/supabase';

export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

export const rateLimit = new Map<string, { count: number; start: number }>();

export type ContactSubmissionPayload = {
  name: string;
  email: string;
  message: string;
  honeypot: string;
  csrfToken: string;
  recaptchaToken: string;
};

export type ContactSubmissionContext = {
  ip: string;
  csrfCookie: string;
};

export type ContactSubmissionResult = {
  success: boolean;
  code?:
    | 'rate_limit'
    | 'invalid_input'
    | 'invalid_csrf'
    | 'invalid_recaptcha'
    | 'recaptcha_disabled'
    | 'server_not_configured'
    | 'server_unavailable';
  status?: number;
};

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) =>
    (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      } as const
    )[c]!,
  );

const cleanupExpiredEntries = (now: number) => {
  for (const [key, value] of rateLimit) {
    if (now - value.start > RATE_LIMIT_WINDOW_MS) {
      rateLimit.delete(key);
    }
  }
};

export const mapCodeToStatus = (code?: ContactSubmissionResult['code']) => {
  switch (code) {
    case 'rate_limit':
      return 429;
    case 'invalid_input':
    case 'invalid_recaptcha':
      return 400;
    case 'invalid_csrf':
      return 403;
    case 'recaptcha_disabled':
    case 'server_not_configured':
      return 503;
    default:
      return 500;
  }
};

export const generateCsrfToken = () => randomBytes(32).toString('hex');

export async function handleContactSubmission(
  payload: ContactSubmissionPayload,
  context: ContactSubmissionContext,
): Promise<ContactSubmissionResult> {
  const { ip, csrfCookie } = context;
  try {
    validateServerEnv(process.env);
  } catch (err) {
    if (!process.env.RECAPTCHA_SECRET) {
      console.warn('Contact submission rejected', {
        ip,
        reason: 'recaptcha_disabled',
      });
      return { success: false, code: 'recaptcha_disabled', status: 503 };
    }
    console.error('Contact submission failed during env validation', err);
    return { success: false, code: 'server_not_configured', status: 503 };
  }

  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimit.set(ip, entry);
  cleanupExpiredEntries(now);
  if (entry.count > RATE_LIMIT_MAX) {
    console.warn('Contact submission rejected', { ip, reason: 'rate_limit' });
    return { success: false, code: 'rate_limit', status: 429 };
  }

  if (!payload.csrfToken || !csrfCookie || payload.csrfToken !== csrfCookie) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_csrf' });
    return { success: false, code: 'invalid_csrf', status: 403 };
  }

  const { recaptchaToken, ...rest } = payload;
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.warn('Contact submission rejected', { ip, reason: 'recaptcha_disabled' });
    return { success: false, code: 'recaptcha_disabled', status: 503 };
  }
  if (!recaptchaToken) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
    return { success: false, code: 'invalid_recaptcha', status: 400 };
  }

  try {
    const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: String(secret ?? ''),
        response: String(recaptchaToken ?? ''),
      }),
    });
    const captcha = await verify.json();
    if (!captcha.success) {
      console.warn('Contact submission rejected', { ip, reason: 'invalid_recaptcha' });
      return { success: false, code: 'invalid_recaptcha', status: 400 };
    }
  } catch (error) {
    console.warn('Contact submission rejected', {
      ip,
      reason: 'invalid_recaptcha',
      error,
    });
    return { success: false, code: 'invalid_recaptcha', status: 400 };
  }

  let sanitized: { name: string; email: string; message: string };
  try {
    const parsed = contactSchema.parse({
      ...rest,
      csrfToken: payload.csrfToken,
      recaptchaToken,
    });
    if (parsed.honeypot) {
      console.warn('Contact submission rejected', { ip, reason: 'invalid_input' });
      return { success: false, code: 'invalid_input', status: 400 };
    }
    sanitized = {
      name: sanitize(parsed.name),
      email: parsed.email,
      message: sanitize(parsed.message),
    };
  } catch (error) {
    console.warn('Contact submission rejected', { ip, reason: 'invalid_input', error });
    return { success: false, code: 'invalid_input', status: 400 };
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
  } catch (error) {
    console.warn('Failed to store contact message', { ip, error });
  }

  return { success: true, status: 200 };
}

