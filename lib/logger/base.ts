const SENSITIVE_KEYS = new Set(['password', 'secret', 'token', 'key']);

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

class ConsoleLogger implements Logger {
  constructor(private readonly correlationId: string) {}

  private log(level: string, message: string, meta: Record<string, any> = {}) {
    const safeMeta: Record<string, any> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
        safeMeta[key] = value;
      }
    }
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

export function createConsoleLogger(correlationId: string): Logger {
  return new ConsoleLogger(correlationId);
}

export function fallbackCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
