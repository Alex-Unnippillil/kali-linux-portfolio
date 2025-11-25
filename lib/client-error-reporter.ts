import { captureClientException } from './monitoring/sentry';
import { REDACTED, scrubClientPayload, scrubValue } from './monitoring/scrub';

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  segment?: string;
}

function buildClientPayload(error: Error, componentStack?: string): ClientErrorPayload {
  const basePayload: ClientErrorPayload = {
    message: error.message || REDACTED,
    stack: error.stack,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    segment: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };

  return scrubClientPayload(basePayload);
}

function createSafeError(error: Error) {
  const safe = new Error(scrubValue(error.message));
  safe.name = error.name || 'Error';
  if (error.stack) {
    safe.stack = scrubValue(error.stack);
  }
  return safe;
}

interface ReportOptions {
  skipCapture?: boolean;
}

export async function reportClientError(error: Error, componentStack?: string, options?: ReportOptions) {
  const payload = buildClientPayload(error, componentStack);
  const safeError = createSafeError(error);

  if (!options?.skipCapture) {
    captureClientException(safeError, payload);
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[ClientError]', payload);
    return;
  }

  if (typeof fetch !== 'function') {
    return;
  }

  try {
    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (err) {
    console.error('Failed to report client error', scrubValue(err));
  }
}
