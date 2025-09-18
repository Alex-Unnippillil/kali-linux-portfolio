const SENSITIVE_KEYS = new Set(['password', 'secret', 'token', 'key']);
const SENSITIVE_PATTERNS = [/pass(word)?/i, /secret/i, /token/i, /key/i, /authorization/i, /session/i];

const MAX_STRING_LENGTH = 500;

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return `${value.slice(0, MAX_STRING_LENGTH)}…`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (
      SENSITIVE_KEYS.has(key.toLowerCase()) ||
      SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      result[key] = '[REDACTED]';
      continue;
    }
    result[key] = sanitizeValue(entryValue, seen);
  }

  seen.delete(value as object);
  return result;
}

function sanitizeMeta(meta: Record<string, unknown> = {}): Record<string, unknown> {
  const seen = new WeakSet<object>();
  return sanitizeValue(meta, seen) as Record<string, unknown>;
}

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

class ConsoleLogger implements Logger {
  constructor(private correlationId: string) {}

  private log(level: string, message: string, meta: Record<string, any> = {}) {
    const safeMeta = sanitizeMeta(meta);
    const entry = {
      level,
      message,
      correlationId: this.correlationId,
      ...safeMeta,
    };
    console.log(JSON.stringify(entry));
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }
  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }
  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }
}

function generateCorrelationId(): string {
  if (typeof globalThis === 'object') {
    const cryptoObj: any = (globalThis as any).crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
  }
  try {
    const { randomUUID } = require('crypto');
    return randomUUID();
  } catch {
    // Fallback for environments without crypto support
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export function createLogger(correlationId: string = generateCorrelationId()): Logger {
  return new ConsoleLogger(correlationId);
}
