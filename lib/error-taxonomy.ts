export type ErrorCategory = 'network' | 'parse' | 'permission' | 'unknown';

export interface ClassifiedError {
  category: ErrorCategory;
  error: Error;
  retryable: boolean;
  diagnostics: Record<string, string | number | boolean | null | undefined>;
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed', options?: ErrorOptions) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

export class ParseError extends Error {
  constructor(message = 'Response could not be parsed', options?: ErrorOptions) {
    super(message, options);
    this.name = 'ParseError';
  }
}

export class PermissionError extends Error {
  constructor(message = 'Permission denied', options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermissionError';
  }
}

const NETWORK_ERROR_NAMES = new Set([
  'NetworkError',
  'TypeError',
  'FetchError',
  'AxiosError',
]);

const PERMISSION_ERROR_NAMES = new Set([
  'PermissionError',
  'NotAllowedError',
  'SecurityError',
  'PermissionDeniedError',
  'NotFoundError',
]);

const PARSE_ERROR_NAMES = new Set(['ParseError', 'SyntaxError', 'DOMException']);

function normalizeError(input: unknown): Error {
  if (input instanceof Error) {
    return input;
  }

  if (typeof input === 'string') {
    return new Error(input);
  }

  if (isPlainObject(input)) {
    const { message, name } = input as { message?: unknown; name?: unknown };
    const error = new Error(typeof message === 'string' ? message : 'Unexpected error');
    if (typeof name === 'string') {
      error.name = name;
    }
    return error;
  }

  return new Error('Unexpected error');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function looksLikeNetworkError(error: Error): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (NETWORK_ERROR_NAMES.has(error.name)) {
    const lowerMessage = error.message.toLowerCase();
    return (
      lowerMessage.includes('network') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('load failed') ||
      lowerMessage.includes('offline') ||
      lowerMessage.includes('timeout')
    );
  }

  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    const code = ((error as { code?: string }).code ?? '').toUpperCase();
    if (code.startsWith('ECONN') || code === 'ETIMEDOUT') {
      return true;
    }
  }

  return false;
}

function looksLikeParseError(error: Error): boolean {
  if (error instanceof ParseError) {
    return true;
  }

  if (PARSE_ERROR_NAMES.has(error.name)) {
    return true;
  }

  const lowerMessage = error.message.toLowerCase();
  return (
    lowerMessage.includes('unexpected token') ||
    lowerMessage.includes('parse') ||
    lowerMessage.includes('json')
  );
}

function looksLikePermissionError(error: Error): boolean {
  if (error instanceof PermissionError) {
    return true;
  }

  if (PERMISSION_ERROR_NAMES.has(error.name)) {
    return true;
  }

  const lowerMessage = error.message.toLowerCase();
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return true;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number' && (status === 401 || status === 403)) {
    return true;
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    return looksLikePermissionError(cause);
  }

  return false;
}

function inferDiagnostics(error: Error): ClassifiedError['diagnostics'] {
  const diagnostics: ClassifiedError['diagnostics'] = {
    name: error.name,
    hasStack: Boolean(error.stack),
  };

  if (typeof window !== 'undefined') {
    diagnostics.online = window.navigator?.onLine;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number') {
    diagnostics.httpStatus = status;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' || typeof code === 'number') {
    diagnostics.code = code;
  }

  return diagnostics;
}

export function classifyError(input: unknown): ClassifiedError {
  const error = normalizeError(input);

  if (looksLikeNetworkError(error)) {
    return {
      category: 'network',
      error,
      retryable: true,
      diagnostics: inferDiagnostics(error),
    };
  }

  if (looksLikeParseError(error)) {
    return {
      category: 'parse',
      error,
      retryable: true,
      diagnostics: inferDiagnostics(error),
    };
  }

  if (looksLikePermissionError(error)) {
    return {
      category: 'permission',
      error,
      retryable: false,
      diagnostics: inferDiagnostics(error),
    };
  }

  return {
    category: 'unknown',
    error,
    retryable: false,
    diagnostics: inferDiagnostics(error),
  };
}

export interface ErrorPresentation {
  title: string;
  message: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function getErrorPresentation(classification: ClassifiedError): ErrorPresentation {
  switch (classification.category) {
    case 'network':
      return {
        title: 'Connection hiccup',
        message: 'We could not reach the service. Check your connection or VPN and then retry the operation.',
        primaryActionLabel: 'Retry request',
      };
    case 'parse':
      return {
        title: 'Data could not be processed',
        message: 'The response looked corrupted or outdated. Resetting will request fresh data without reloading the desktop.',
        primaryActionLabel: 'Reset view',
      };
    case 'permission':
      return {
        title: 'Permission required',
        message: 'The browser blocked an operation. Allow the permission in your browser or system settings, then retry.',
        primaryActionLabel: 'Retry with permissions',
      };
    default:
      return {
        title: 'Unexpected error',
        message: 'The app ran into something it did not expect. Retrying will attempt the operation again without a full reload.',
        primaryActionLabel: 'Try again',
      };
  }
}
