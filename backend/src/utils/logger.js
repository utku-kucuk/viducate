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

// Lazy load Log model to avoid circular dependency issues
let LogModel = null;
const getLogModel = () => {
  if (!LogModel) {
    try {
      LogModel = require('../models/Log');
    } catch (e) {
      console.error('Failed to load Log model in logger', e);
    }
  }
  return LogModel;
};

const safeLog = (level, args) => {
  const message = formatArgs(args).join(' ');

  // Console output
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(...formatArgs(args));
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(...formatArgs(args));
  // eslint-disable-next-line no-console
  else console.log(...formatArgs(args));

  // Database output (fire and forget)
  try {
    const Log = getLogModel();
    if (Log) {
      // Extract userId or context if present in args (convention: if last arg is object with meta)
      let meta = {};
      let userId = null;
      let context = null;

      // Simple heuristic: if we have objects in args, store them in meta
      const objects = args.filter(a => typeof a === 'object' && !(a instanceof Error) && a !== null);
      if (objects.length > 0) {
        // Merge all objects into meta
        meta = Object.assign({}, ...objects);
        if (meta.userId) userId = meta.userId;
        if (meta.context) context = meta.context;
        // Clean specific fields from meta if used for column
        // delete meta.userId; 
        // delete meta.context;
      }

      // Also store error stack if present
      const error = args.find(a => a instanceof Error);
      if (error) {
        meta.stack = error.stack;
        meta.errorName = error.name;
      }

      Log.create({
        level,
        message: message.substring(0, 5000), // Truncate if too long
        meta,
        userId,
        context
      }).catch(err => {
        // Fallback if DB logging fails - do not recursive log
        if (env !== 'production') console.error('Failed to save log to DB:', err.message);
      });
    }
  } catch (err) {
    // Silent fail
  }
};

const logger = {
  error: (...args) => {
    if (shouldLog('error')) {
      safeLog('error', args);
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      safeLog('warn', args);
    }
  },
  info: (...args) => {
    if (shouldLog('info')) {
      safeLog('info', args);
    }
  },
  debug: (...args) => {
    if (shouldLog('debug') && env !== 'production') {
      safeLog('debug', args);
    }
  },
};

module.exports = logger;


