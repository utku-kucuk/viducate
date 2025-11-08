const LEVELS = ['error', 'warn', 'info', 'debug'];
const env = process.env.NODE_ENV || 'development';
const defaultLevel = env === 'production' ? 'info' : 'debug';
const configuredLevel = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const activeIndex = Math.max(0, LEVELS.indexOf(configuredLevel));

function shouldLog(level) {
  const idx = LEVELS.indexOf(level);
  return idx >= 0 && idx <= activeIndex;
}

function formatArgs(args) {
  return args.map((arg) => {
    if (arg instanceof Error) {
      if (env === 'production') {
        return `${arg.name}: ${arg.message}`;
      }
      return arg.stack || `${arg.name}: ${arg.message}`;
    }
    return arg;
  });
}

const logger = {
  error: (...args) => {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(...formatArgs(args));
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(...formatArgs(args));
    }
  },
  info: (...args) => {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.log(...formatArgs(args));
    }
  },
  debug: (...args) => {
    if (shouldLog('debug') && env !== 'production') {
      // eslint-disable-next-line no-console
      console.log(...formatArgs(args));
    }
  },
};

module.exports = logger;


