type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function getLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in levelOrder) {
    return env as LogLevel;
  }
  return 'info';
}

const activeLevel = getLogLevel();
const isProd = process.env.NODE_ENV === 'production';

function shouldLog(level: LogLevel) {
  return levelOrder[level] <= levelOrder[activeLevel];
}

const logger = {
  error: (...args: any[]) => {
    if (isProd) return;
    if (shouldLog('error')) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isProd) return;
    if (shouldLog('warn')) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isProd) return;
    if (shouldLog('info')) console.info(...args);
  },
  log: (...args: any[]) => {
    if (isProd) return;
    if (shouldLog('info')) console.log(...args);
  },
  debug: (...args: any[]) => {
    if (isProd) return;
    if (shouldLog('debug')) console.debug(...args);
  },
};

export default logger;
