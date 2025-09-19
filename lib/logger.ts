const SENSITIVE_KEYS = new Set(['password', 'secret', 'token', 'key']);

export interface LogEntry {
  level: string;
  message: string;
  correlationId: string;
  [key: string]: any;
}

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

export function formatLogEntry(
  level: string,
  message: string,
  correlationId: string,
  meta: Record<string, any> = {},
): LogEntry {
  const safeMeta: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      safeMeta[key] = value;
    }
  }
  return {
    level,
    message,
    correlationId,
    ...safeMeta,
  };
}

class ConsoleLogger implements Logger {
  constructor(private correlationId: string) {}

  private log(level: string, message: string, meta: Record<string, any> = {}) {
    const entry = formatLogEntry(level, message, this.correlationId, meta);
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

export function generateCorrelationId(): string {
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
