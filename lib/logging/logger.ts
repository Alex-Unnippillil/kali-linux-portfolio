import { getTelemetry } from '../../utils/settingsStore';

interface ErrorContext {
  [key: string]: unknown;
}

export function logHandledError(error: unknown, context: ErrorContext = {}): void {
  if (!getTelemetry()) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    type: 'error',
    message: err.message,
    stack: err.stack,
    context,
    timestamp: Date.now(),
  };
  console.log('[telemetry]', entry);
}

export async function time<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    if (getTelemetry()) {
      const entry = {
        type: 'timing',
        name,
        duration,
        timestamp: Date.now(),
      };
      console.log('[telemetry]', entry);
    }
  }
}
