import { isBrowser } from '@/utils/env';
export interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  segment: string;
}

export async function reportClientError(error: Error, componentStack?: string) {
  const payload: ClientErrorPayload = {
    message: error.message,
    stack: error.stack,
    componentStack,
    url: isBrowser() ? window.location.href : '',
    segment: isBrowser() ? window.location.pathname : '',
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('[ClientError]', payload);
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
