export const REDACTED = '[REDACTED]';
const MAX_LENGTH = 5000;

const SENSITIVE_KEYWORDS = new Set([
  'password',
  'secret',
  'token',
  'key',
  'auth',
  'authorization',
  'cookie',
  'session',
  'email',
  'phone',
]);

const PII_PATTERNS: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, // email addresses
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, // SSN-like patterns
  /\b\d{13,16}\b/g, // potential card numbers
  /\b\+?\d{1,3}?[\s.-]?(?:\(\d{1,4}\)|\d{1,4})[\s.-]?\d{1,4}[\s.-]?\d{1,9}\b/g, // phone numbers
];

function scrubString(value: string): string {
  let result = value.slice(0, MAX_LENGTH);
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

function scrubArray(input: unknown[]): unknown[] {
  return input.map((entry) => scrubValue(entry));
}

function scrubObject(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYWORDS.has(key.toLowerCase())) {
      sanitized[key] = REDACTED;
      continue;
    }
    sanitized[key] = scrubValue(value);
  }
  return sanitized;
}

export function scrubValue<T>(value: T): T {
  if (typeof value === 'string') {
    return scrubString(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return scrubArray(value) as unknown as T;
  }

  if (value && typeof value === 'object') {
    return scrubObject(value as Record<string, unknown>) as unknown as T;
  }

  return value;
}

export function scrubUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(input);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    const [withoutQuery] = input.split('?');
    return withoutQuery;
  }
}

export function scrubClientPayload<T extends Record<string, unknown>>(payload: T): T {
  const sanitized = scrubObject(payload);
  if ('url' in sanitized && typeof sanitized.url === 'string') {
    sanitized.url = scrubUrl(sanitized.url) ?? sanitized.url;
  }
  if ('segment' in sanitized && typeof sanitized.segment === 'string') {
    sanitized.segment = scrubUrl(sanitized.segment) ?? sanitized.segment;
  }
  return sanitized as T;
}

export function sanitizeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return scrubObject({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
  if (typeof error === 'string') {
    return { message: scrubString(error) };
  }
  return scrubValue(error) as Record<string, unknown>;
}

