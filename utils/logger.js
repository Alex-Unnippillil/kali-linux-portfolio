const levelOrder = { error: 0, warn: 1, info: 2, debug: 3 };

function getLogLevel() {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in levelOrder) {
    return env;
  }
  return 'info';
}

const activeLevel = getLogLevel();
const isProd = process.env.NODE_ENV === 'production';

function shouldLog(level) {
  return levelOrder[level] <= levelOrder[activeLevel];
}

const logger = {
  error: (...args) => {
    if (isProd) return;
    if (shouldLog('error')) console.error(...args);
  },
  warn: (...args) => {
    if (isProd) return;
    if (shouldLog('warn')) console.warn(...args);
  },
  info: (...args) => {
    if (isProd) return;
    if (shouldLog('info')) console.info(...args);
  },
  log: (...args) => {
    if (isProd) return;
    if (shouldLog('info')) console.log(...args);
  },
  debug: (...args) => {
    if (isProd) return;
    if (shouldLog('debug')) console.debug(...args);
  },
};

export default logger;
