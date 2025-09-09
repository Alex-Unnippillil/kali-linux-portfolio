import { loadFromStorage, saveToStorage } from './persistent';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_LEVEL_KEY = 'log-level';

function readInitialLevel(): LogLevel {
  const stored = loadFromStorage<LogLevel>(
    LOG_LEVEL_KEY,
    'info',
    (v: unknown): v is LogLevel => typeof v === 'string' && v in levelOrder,
  );
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in levelOrder) {
    return env as LogLevel;
  }
  return stored;
}

let activeLevel: LogLevel = readInitialLevel();
const isProd = process.env.NODE_ENV === 'production';

export function setLogLevel(level: LogLevel): void {
  activeLevel = level;
  saveToStorage(LOG_LEVEL_KEY, level);
}

export function getLogLevel(): LogLevel {
  return activeLevel;
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] <= levelOrder[activeLevel];
}

const logger = {
  error: (...args: unknown[]) => {
    if (isProd) return;
    if (shouldLog('error')) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isProd) return;
    if (shouldLog('warn')) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isProd) return;
    if (shouldLog('info')) console.info(...args);
  },
  log: (...args: unknown[]) => {
    if (isProd) return;
    if (shouldLog('info')) console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (isProd) return;
    if (shouldLog('debug')) console.debug(...args);
  },
};

export function createLogger(prefix: string) {
  return {
    error: (...args: unknown[]) => logger.error(prefix, ...args),
    warn: (...args: unknown[]) => logger.warn(prefix, ...args),
    info: (...args: unknown[]) => logger.info(prefix, ...args),
    log: (...args: unknown[]) => logger.log(prefix, ...args),
    debug: (...args: unknown[]) => logger.debug(prefix, ...args),
  };
}

export default logger;
