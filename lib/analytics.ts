import { track } from '@vercel/analytics';
import * as Sentry from '@sentry/nextjs';

export function trackEvent(event: string, game: string) {
  try {
    track(event, { game });
  } catch {
    // analytics is best-effort only
  }
}

export function captureError(error: unknown, game: string) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { tags: { game } });
  }
}
