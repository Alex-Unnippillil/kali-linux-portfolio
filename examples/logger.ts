import { createLogger } from '@/lib/logger';

export interface LoggerExampleEntry {
  level: string;
  message: string;
  correlationId: string;
  meta: Record<string, unknown>;
}

export function runLoggerExample(): LoggerExampleEntry[] {
  const captured: LoggerExampleEntry[] = [];
  const originalConsoleLog = console.log;

  console.log = (entry?: unknown, ...rest: unknown[]) => {
    const parts = [entry, ...rest].filter((value) => value !== undefined);
    for (const value of parts) {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          const { level, message, correlationId, ...meta } = parsed;
          captured.push({
            level: String(level),
            message: String(message),
            correlationId: String(correlationId),
            meta,
          });
          continue;
        } catch {
          // fall through to generic handling
        }
      }

      captured.push({
        level: 'unknown',
        message: String(value),
        correlationId: 'unknown',
        meta: {},
      });
    }
  };

  try {
    const logger = createLogger('examples-correlation-id');
    logger.info('Booting logger example', {
      user: 'alice',
      password: 'super-secret',
    });
    logger.error('Example failure', {
      reason: 'demo-only',
      token: 'top-secret-token',
    });
  } finally {
    console.log = originalConsoleLog;
  }

  return captured;
}
