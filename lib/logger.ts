const SENSITIVE_KEYS = new Set(['password', 'secret', 'token', 'key']);

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEvent {
  appId: string;
  correlationId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

export const LOG_BUFFER_LIMIT = 200;

type LogListener = () => void;

const logBuffers = new Map<string, LogEvent[]>();
const listeners = new Set<LogListener>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore listener errors to avoid breaking logging.
    }
  }
}

function getOrCreateBuffer(appId: string) {
  if (!logBuffers.has(appId)) {
    logBuffers.set(appId, []);
  }
  return logBuffers.get(appId)!;
}

function sanitizeMeta(meta?: Record<string, any>) {
  if (!meta) {
    return undefined;
  }
  const safeMeta: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      safeMeta[key] = value;
    }
  }
  return Object.keys(safeMeta).length > 0 ? safeMeta : undefined;
}

function appendToBuffer(appId: string, entry: LogEvent) {
  const buffer = getOrCreateBuffer(appId);
  buffer.push(entry);
  if (buffer.length > LOG_BUFFER_LIMIT) {
    buffer.splice(0, buffer.length - LOG_BUFFER_LIMIT);
  }
  notifyListeners();
}

class BufferedConsoleLogger implements Logger {
  constructor(private correlationId: string, private appId: string) {}

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const safeMeta = sanitizeMeta(meta);
    const entry: LogEvent = {
      level,
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      appId: this.appId,
      ...(safeMeta ? { meta: safeMeta } : {}),
    };
    appendToBuffer(this.appId, entry);
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

export interface LoggerOptions {
  correlationId?: string;
  appId?: string;
}

export function subscribeToLogUpdates(listener: LogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBufferedAppIds(): string[] {
  return Array.from(logBuffers.keys()).sort();
}

export function getAppLogBuffer(appId: string): LogEvent[] {
  const buffer = logBuffers.get(appId);
  return buffer ? buffer.map((entry) => ({ ...entry, meta: entry.meta ? { ...entry.meta } : undefined })) : [];
}

export function clearAppLogBuffer(appId: string) {
  if (logBuffers.delete(appId)) {
    notifyListeners();
  }
}

export function formatLogsForExport(appId: string) {
  const logs = getAppLogBuffer(appId);
  return JSON.stringify(
    {
      appId,
      exportedAt: new Date().toISOString(),
      count: logs.length,
      logs,
    },
    null,
    2,
  );
}

export function createLogger(options?: string | LoggerOptions): Logger {
  const opts: LoggerOptions = typeof options === 'string' ? { correlationId: options } : options ?? {};
  const correlationId = opts.correlationId ?? generateCorrelationId();
  const appId = opts.appId ?? 'global';
  return new BufferedConsoleLogger(correlationId, appId);
}
