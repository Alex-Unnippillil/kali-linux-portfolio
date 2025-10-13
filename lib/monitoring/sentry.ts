import * as Sentry from '@sentry/nextjs';
import { REDACTED, sanitizeErrorForLog, scrubClientPayload, scrubUrl, scrubValue } from './scrub';

const DEFAULT_SAMPLE_RATE = 1;
const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_PROFILES_SAMPLE_RATE = 0;
const DEFAULT_REPLAYS_SESSION_RATE = 0.02;
const DEFAULT_REPLAYS_ERROR_RATE = 1;

function resolveEnv(key: string): string | undefined {
  if (typeof window === 'undefined') {
    return process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`];
  }
  return process.env[`NEXT_PUBLIC_${key}`];
}

function parseSampleRate(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed)) {
    if (parsed < 0) return 0;
    if (parsed > 1) return 1;
    return parsed;
  }
  return fallback;
}

function resolveDsn(): string | undefined {
  if (typeof window === 'undefined') {
    return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  }
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

let initialized = false;

export function ensureSentry(): { enabled: boolean } {
  const dsn = resolveDsn();
  if (!dsn) {
    return { enabled: false };
  }

  if (!initialized) {
    Sentry.init({
      dsn,
      enabled: true,
      environment:
        resolveEnv('SENTRY_ENVIRONMENT') ??
        process.env.NEXT_PUBLIC_VERCEL_ENV ??
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV,
      sampleRate: parseSampleRate(resolveEnv('SENTRY_SAMPLE_RATE'), DEFAULT_SAMPLE_RATE),
      tracesSampleRate: parseSampleRate(resolveEnv('SENTRY_TRACES_SAMPLE_RATE'), DEFAULT_TRACES_SAMPLE_RATE),
      profilesSampleRate: parseSampleRate(resolveEnv('SENTRY_PROFILES_SAMPLE_RATE'), DEFAULT_PROFILES_SAMPLE_RATE),
      replaysSessionSampleRate: parseSampleRate(
        resolveEnv('SENTRY_REPLAYS_SESSION_SAMPLE_RATE'),
        DEFAULT_REPLAYS_SESSION_RATE,
      ),
      replaysOnErrorSampleRate: parseSampleRate(
        resolveEnv('SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE'),
        DEFAULT_REPLAYS_ERROR_RATE,
      ),
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request?.url) {
          event.request.url = scrubUrl(event.request.url) ?? event.request.url;
        }
        if (event.request?.headers) {
          event.request.headers = scrubValue(event.request.headers);
        }
        if (event.user) {
          event.user = scrubValue(event.user);
        }
        if (event.extra) {
          event.extra = scrubValue(event.extra);
        }
        if (event.contexts) {
          event.contexts = scrubValue(event.contexts);
        }
        return event;
      },
    });
    initialized = true;
  }

  return { enabled: true };
}

export function captureException(
  error: unknown,
  extras?: Record<string, unknown>,
  tags?: Record<string, string>,
) {
  if (!ensureSentry().enabled) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    if (extras) {
      scope.setExtras(scrubValue(extras));
    }
    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        scope.setTag(key, value);
      }
    }
    return Sentry.captureException(error);
  });
}

export function captureClientException(error: Error, payload: Record<string, unknown>) {
  const sanitizedPayload = scrubClientPayload(payload);
  const sanitizedError = new Error(scrubValue(error.message));
  sanitizedError.name = error.name || 'ClientError';
  sanitizedError.stack = error.stack ? scrubValue(error.stack) : sanitizedError.stack;

  return captureException(sanitizedError, {
    ...sanitizedPayload,
    source: 'client',
    boundary: 'ErrorBoundary',
  });
}

export function recordSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  if (!ensureSentry().enabled) return;
  Sentry.addBreadcrumb({
    level: 'error',
    message,
    data: data ? scrubValue(data) : undefined,
  });
}

export function getRedactedValue() {
  return REDACTED;
}

export function summarizeError(error: unknown) {
  return sanitizeErrorForLog(error);
}

