import type { ErrorCategory } from './error-taxonomy';

export interface ClientErrorPayload {
  message: string;
  name: string;
  stack?: string;
  componentStack?: string;
  url: string;
  segment: string;
  category: ErrorCategory;
  diagnostics: Record<string, string | number | boolean | null | undefined>;
  retryable: boolean;
}

export interface ClientErrorContext {
  componentStack?: string;
  category?: ErrorCategory;
  diagnostics?: Record<string, string | number | boolean | null | undefined>;
  retryable?: boolean;
}

function getSanitizedLocation() {
  if (typeof window === 'undefined') {
    return { url: '', segment: '' };
  }

  const { location } = window;
  const base = `${location.origin}${location.pathname}`;
  const hash = location.hash ? location.hash : '';
  return { url: `${base}${hash}`, segment: location.pathname };
}

export async function reportClientError(error: Error, context: ClientErrorContext = {}) {
  const { componentStack, category = 'unknown', diagnostics = {}, retryable = false } = context;
  const { url, segment } = getSanitizedLocation();

  const payload: ClientErrorPayload = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    componentStack,
    url,
    segment,
    category,
    diagnostics,
    retryable,
  };

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ClientError:${category}]`, payload);
    return;
  }

  try {
    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to report client error', err);
  }
}
