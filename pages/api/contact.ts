import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes, createHash } from 'crypto';

import trackServerEvent from '../../lib/analytics-server';
import { createLogger } from '../../lib/logger';
import {
  SlidingWindowRateLimiter,
  hashIdentifier,
  isBypassTokenValid,
  type RateLimitResult,
} from '../../lib/rate-limit';
import { getServiceSupabase } from '../../lib/supabase';
import { validateServerEnv } from '../../lib/validate';
import { formatCookie } from '../../utils/cookies';
import { contactSchema } from '../../utils/contactSchema';

const CONTACT_SECURITY_DEFAULT = 'captcha';
const POW_DEFAULT_DIFFICULTY = 4;
const POW_DEFAULT_MAX_AGE_MS = 5 * 60_000; // 5 minutes

export const CONTACT_RATE_LIMIT_WINDOW_MS = 60_000;
const CONTACT_RATE_LIMIT_MAX = 5;

export const contactRateLimiter = new SlidingWindowRateLimiter({
  windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
  max: CONTACT_RATE_LIMIT_MAX,
});

type ContactSecurityMode = 'captcha' | 'pow' | 'disabled';

interface ProofOfWorkPayload {
  nonce: string;
  timestamp: number;
  digest: string;
}

function getSecurityMode(env: NodeJS.ProcessEnv): ContactSecurityMode {
  const value = env.CONTACT_SECURITY_MODE?.toLowerCase();
  if (value === 'pow' || value === 'disabled') {
    return value;
  }
  return CONTACT_SECURITY_DEFAULT;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.trim();
  }
  return req.socket?.remoteAddress ?? '';
}

function parseProofOfWork(input: unknown): ProofOfWorkPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const candidate = input as Record<string, unknown>;
  const nonce = candidate.nonce;
  const timestamp = candidate.timestamp;
  const digest = candidate.digest;
  const parsedTimestamp =
    typeof timestamp === 'string'
      ? Number.parseInt(timestamp, 10)
      : typeof timestamp === 'number'
      ? timestamp
      : Number.NaN;

  if (
    typeof nonce !== 'string' ||
    !Number.isFinite(parsedTimestamp) ||
    typeof digest !== 'string'
  ) {
    return null;
  }
  return {
    nonce,
    timestamp: parsedTimestamp,
    digest,
  };
}

function verifyProofOfWork(
  payload: ProofOfWorkPayload | null,
  env: NodeJS.ProcessEnv,
  now: number = Date.now(),
): boolean {
  if (!payload) return false;

  const maxAgeMs = Number.parseInt(env.CONTACT_POW_MAX_AGE_MS ?? '', 10);
  const allowedSkew = Number.isFinite(maxAgeMs) ? maxAgeMs : POW_DEFAULT_MAX_AGE_MS;
  if (Math.abs(now - payload.timestamp) > allowedSkew) {
    return false;
  }

  const difficultyRaw = Number.parseInt(env.CONTACT_POW_DIFFICULTY ?? '', 10);
  const difficulty = Number.isFinite(difficultyRaw)
    ? Math.min(Math.max(difficultyRaw, 1), 10)
    : POW_DEFAULT_DIFFICULTY;
  const salt = env.CONTACT_POW_SALT ?? '';

  const computed = createHash('sha256')
    .update(`${payload.timestamp}:${payload.nonce}:${salt}`)
    .digest('hex');

  if (computed !== payload.digest) {
    return false;
  }

  const prefix = '0'.repeat(difficulty);
  return computed.startsWith(prefix);
}

function respondWithRateLimit(res: NextApiResponse, result: RateLimitResult) {
  res.setHeader('RateLimit-Limit', String(result.limit));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  res.setHeader('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  if (!result.success && typeof result.retryAfter === 'number') {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const logger = createLogger();
  const securityMode = getSecurityMode(process.env);

  if (securityMode === 'captcha') {
    try {
      validateServerEnv(process.env);
    } catch {
      res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
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
      }),
    );
    res.status(200).json({ ok: true, csrfToken: token, securityMode });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const ip = getClientIp(req);
  const ipHash = hashIdentifier(ip);
  const rateLimitBypassed = isBypassTokenValid(
    req.headers['x-rate-limit-bypass'],
    process.env.CONTACT_RATE_LIMIT_BYPASS_SECRET,
  );

  if (!rateLimitBypassed) {
    const rateLimitResult = contactRateLimiter.attempt(ip);
    respondWithRateLimit(res, rateLimitResult);
    if (!rateLimitResult.success) {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'rate_limit',
      });
      void trackServerEvent('contact_abuse_detected', {
        reason: 'rate_limit',
      });
      res.status(429).json({ ok: false, code: 'rate_limit' });
      return;
    }
  } else {
    res.setHeader('RateLimit-Limit', String(CONTACT_RATE_LIMIT_MAX));
    res.setHeader('RateLimit-Remaining', String(CONTACT_RATE_LIMIT_MAX));
    res.setHeader('RateLimit-Reset', '0');
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.csrfToken;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    logger.warn('contact.submission_blocked', {
      ipHash,
      reason: 'invalid_csrf',
    });
    void trackServerEvent('contact_abuse_detected', {
      reason: 'invalid_csrf',
    });
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    return;
  }

  const { recaptchaToken, proofOfWork, ...rest } = req.body || {};

  if (securityMode === 'captcha') {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'recaptcha_disabled',
      });
      res.status(503).json({ ok: false, code: 'recaptcha_disabled' });
      return;
    }
    if (!recaptchaToken) {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'invalid_recaptcha',
      });
      void trackServerEvent('contact_abuse_detected', {
        reason: 'invalid_recaptcha',
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
        },
      );
      const captcha = await verify.json();
      if (!captcha.success) {
        logger.warn('contact.submission_blocked', {
          ipHash,
          reason: 'invalid_recaptcha',
        });
        void trackServerEvent('contact_abuse_detected', {
          reason: 'invalid_recaptcha',
        });
        res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
        return;
      }
    } catch {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'invalid_recaptcha',
      });
      res.status(400).json({ ok: false, code: 'invalid_recaptcha' });
      return;
    }
  } else if (securityMode === 'pow') {
    const powPayload = parseProofOfWork(proofOfWork);
    if (!verifyProofOfWork(powPayload, process.env)) {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'invalid_proof_of_work',
      });
      void trackServerEvent('contact_abuse_detected', {
        reason: 'invalid_proof_of_work',
      });
      res.status(400).json({ ok: false, code: 'invalid_proof_of_work' });
      return;
    }
  }

  let sanitized: { name: string; email: string; message: string };
  try {
    const parsed = contactSchema.parse({
      ...rest,
      csrfToken: csrfHeader,
      recaptchaToken: recaptchaToken ?? undefined,
      proofOfWork: proofOfWork ?? undefined,
    });

    if (parsed.honeypot) {
      logger.warn('contact.submission_blocked', {
        ipHash,
        reason: 'honeypot',
      });
      void trackServerEvent('contact_abuse_detected', {
        reason: 'honeypot',
      });
      res.status(400).json({ ok: false, code: 'invalid_input' });
      return;
    }

    sanitized = {
      name: parsed.name,
      email: parsed.email,
      message: parsed.message,
    };
  } catch {
    logger.warn('contact.submission_blocked', {
      ipHash,
      reason: 'invalid_input',
    });
    void trackServerEvent('contact_abuse_detected', {
      reason: 'invalid_input',
    });
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  try {
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from('contact_messages').insert([sanitized]);
    } else {
      logger.info('contact.storage_skipped', { ipHash });
    }
  } catch {
    logger.error('contact.storage_failed', { ipHash });
  }

  logger.info('contact.submitted', {
    ipHash,
    emailHash: hashIdentifier(sanitized.email),
  });

  res.status(200).json({ ok: true });
}
