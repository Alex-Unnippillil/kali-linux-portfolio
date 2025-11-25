import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '../../../lib/logger';
import { captureException, ensureSentry } from '../../../lib/monitoring/sentry';
import { REDACTED, sanitizeErrorForLog, scrubClientPayload, scrubValue } from '../../../lib/monitoring/scrub';

const log = createLogger('client-error-route');

interface IncomingPayload {
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  segment?: string;
}

export async function POST(req: NextRequest) {
  try {
    const raw: IncomingPayload = scrubValue(await req.json());
    const payload = scrubClientPayload({ ...raw });

    const error = new Error(payload.message ?? REDACTED);
    error.name = 'ClientBoundaryError';
    if (payload.stack) {
      error.stack = payload.stack;
    }

    const sentryStatus = ensureSentry();
    if (sentryStatus.enabled) {
      captureException(error, {
        ...payload,
        source: 'client',
        handler: 'api/log-client-error',
      });
    } else {
      log.error('Client error received', payload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const sanitizedError = sanitizeErrorForLog(error);
    log.error('Failed to process client error payload', sanitizedError);
    ensureSentry();
    captureException(new Error('Client error intake failure'), {
      ...sanitizedError,
      handler: 'api/log-client-error',
    });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
