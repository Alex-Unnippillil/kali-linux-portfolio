import {
  ErrorCode,
  getLocalizedErrorEntry,
  LocalizedErrorCatalogEntry,
} from '../types/errorCodes';

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  segment: string;
  code: ErrorCode;
  severity: LocalizedErrorCatalogEntry['severity'];
  locale: LocalizedErrorCatalogEntry['locale'];
  userTitle: string;
  userRemediation: string;
}

export async function reportClientError(
  error: Error,
  componentStack?: string,
  code: ErrorCode = ErrorCode.UNKNOWN
) {
  const localized = getLocalizedErrorEntry(
    code,
    typeof navigator !== 'undefined' ? navigator.language : undefined
  );
  const payload: ClientErrorPayload = {
    message: error.message,
    stack: error.stack,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    segment: typeof window !== 'undefined' ? window.location.pathname : '',
    code: localized.code,
    severity: localized.severity,
    locale: localized.locale,
    userTitle: localized.copy.title,
    userRemediation: localized.copy.remediation,
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
