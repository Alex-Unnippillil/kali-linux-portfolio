import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';
import { contactSchema } from '../../utils/contactSchema';
import { validateServerEnv } from '../../lib/validate';
import { getServiceSupabase } from '../../lib/supabase';
import { formatCookie } from '../../utils/cookies';
import { createLogger } from '../../lib/logger';
import {
  createEmailProvider,
  EmailProviderError,
  type EmailProvider,
} from '../../lib/email/provider';

export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

type RateLimitEntry = { count: number; start: number };

export type RateLimitEvent =
  | { type: 'hit'; bucket: string; count: number }
  | { type: 'blocked'; bucket: string; count: number }
  | { type: 'reset'; bucket: string };

export const rateLimit = new Map<string, RateLimitEntry>();

const rateLimitSubscribers = new Set<(event: RateLimitEvent) => void>();

export function subscribeToRateLimit(
  listener: (event: RateLimitEvent) => void
): () => void {
  rateLimitSubscribers.add(listener);
  return () => rateLimitSubscribers.delete(listener);
}

export function clearRateLimitSubscribers() {
  rateLimitSubscribers.clear();
}

function emitRateLimitEvent(event: RateLimitEvent) {
  for (const listener of rateLimitSubscribers) {
    try {
      listener(event);
    } catch {
      // Ignore listener errors to avoid disrupting request handling.
    }
  }
}

function anonymizeBucket(value: string): string {
  if (!value) {
    return 'anonymous';
  }
  try {
    return createHash('sha256').update(value).digest('hex');
  } catch {
    return 'anonymous';
  }
}

function extractBucketKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const headerValue = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? '';
  const first = headerValue.split(',')[0]?.trim();
  if (first) {
    return first;
  }
  const remote = req.socket?.remoteAddress ?? '';
  return typeof remote === 'string' ? remote : '';
}

type ValidatedEnv = ReturnType<typeof validateServerEnv>;

function buildEmailMessage(
  sanitized: { name: string; email: string; message: string },
  env: NodeJS.ProcessEnv
) {
  const to = env.CONTACT_EMAIL_TO;
  const from = env.CONTACT_EMAIL_FROM || env.CONTACT_EMAIL_TO;
  const subject =
    env.CONTACT_EMAIL_SUBJECT || 'New Kali Linux Portfolio contact request';
  if (!to || !from) {
    return null;
  }
  return {
    to,
    from,
    subject,
    text: `A new message was submitted on Kali Linux Portfolio.\n\nName: ${sanitized.name}\nEmail: ${sanitized.email}\n\nMessage:\n${sanitized.message}\n`,
    replyTo: sanitized.email,
  } as const;
}

async function sendContactEmail(
  provider: EmailProvider,
  env: NodeJS.ProcessEnv,
  sanitized: { name: string; email: string; message: string }
): Promise<{ skipped: boolean }> {
  const message = buildEmailMessage(sanitized, env);
  if (!message) {
    return { skipped: true } as const;
  }
  await provider.send(message);
  return { skipped: false } as const;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const logger = createLogger();
  let validatedEnv: ValidatedEnv;

  try {
    validatedEnv = validateServerEnv(process.env);
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
        secure: Boolean(shouldUseSecure),
      })
    );
    res.status(200).json({ ok: true, csrfToken: token });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const bucketKey = extractBucketKey(req);
  const bucketHash = anonymizeBucket(bucketKey);
  const now = Date.now();
  const entry = rateLimit.get(bucketKey) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
    emitRateLimitEvent({ type: 'reset', bucket: bucketHash });
  }
  entry.count += 1;
  rateLimit.set(bucketKey, entry);
  emitRateLimitEvent({ type: 'hit', bucket: bucketHash, count: entry.count });

  for (const [key, value] of Array.from(rateLimit.entries())) {
    if (now - value.start > RATE_LIMIT_WINDOW_MS) {
      rateLimit.delete(key);
      emitRateLimitEvent({ type: 'reset', bucket: anonymizeBucket(key) });
    }
  }

  if (entry.count > RATE_LIMIT_MAX) {
    emitRateLimitEvent({ type: 'blocked', bucket: bucketHash, count: entry.count });
    logger.warn('Contact submission rejected', { event: 'contact.rate_limit' });
    res.status(429).json({ ok: false, code: 'rate_limit' });
    return;
  }

  const csrfHeaderRaw = req.headers['x-csrf-token'];
  const csrfHeader = Array.isArray(csrfHeaderRaw)
    ? csrfHeaderRaw[0]
    : csrfHeaderRaw;
  const csrfValue = typeof csrfHeader === 'string' ? csrfHeader : '';
  const csrfCookie = req.cookies?.csrfToken ?? '';
  if (!csrfValue || !csrfCookie || csrfValue !== csrfCookie) {
    logger.warn('Contact submission rejected', { event: 'contact.invalid_csrf' });
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    return;
  }

  const { recaptchaToken = '', ...rest } = (req.body as Record<string, any>) || {};
  const secret = validatedEnv.RECAPTCHA_SECRET;
  if (!recaptchaToken) {
    logger.warn('Contact submission rejected', {
      event: 'contact.invalid_recaptcha',
    });
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
      logger.warn('Contact submission rejected', {
        event: 'contact.invalid_recaptcha',
      });
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } catch {
    logger.warn('Contact submission rejected', {
      event: 'contact.invalid_recaptcha',
    });
    res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
    return;
  }

  let sanitized: { name: string; email: string; message: string };
  try {
    const parsed = contactSchema.parse({
      ...rest,
      csrfToken: csrfValue,
      recaptchaToken,
    });
    if (parsed.honeypot) {
      logger.warn('Contact submission rejected', { event: 'contact.honeypot' });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }
    sanitized = {
      name: parsed.name,
      email: parsed.email,
      message: parsed.message,
    };
  } catch {
    logger.warn('Contact submission rejected', { event: 'contact.invalid_input' });
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  try {
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from('contact_messages').insert([sanitized]);
    } else {
      logger.info('Contact message storage skipped', {
        event: 'contact.storage_skipped',
      });
    }
  } catch {
    logger.error('Failed to store contact message', {
      event: 'contact.storage_failed',
    });
  }

  let provider: EmailProvider | null = null;
  try {
    provider = createEmailProvider(process.env, { logger });
  } catch (error) {
    if (error instanceof EmailProviderError) {
      logger.error('Email provider misconfigured', {
        event: 'contact.email_provider_error',
        provider: error.provider,
      });
      res.status(503).json({ ok: false, code: 'email_provider_error' });
      return;
    }
    logger.error('Unknown email provider error', {
      event: 'contact.email_provider_error',
    });
    res.status(503).json({ ok: false, code: 'email_provider_error' });
    return;
  }

  try {
    const result = await sendContactEmail(provider, process.env, sanitized);
    if (result.skipped) {
      logger.info('Contact email skipped', {
        event: 'contact.email_skipped',
      });
    } else {
      logger.info('Contact email delivered', {
        event: 'contact.email_delivered',
        provider: provider.name,
      });
    }
  } catch (error) {
    const providerName = provider?.name ?? 'unknown';
    if (error instanceof EmailProviderError) {
      logger.error('Contact email failed', {
        event: 'contact.email_failed',
        provider: error.provider,
      });
    } else {
      logger.error('Contact email failed', {
        event: 'contact.email_failed',
        provider: providerName,
      });
    }
    res.status(502).json({ ok: false, code: 'email_failed' });
    return;
  }

  logger.info('Contact submission processed', {
    event: 'contact.processed',
    provider: provider.name,
    bucket: bucketHash,
  });
  res.status(200).json({ ok: true });
}
