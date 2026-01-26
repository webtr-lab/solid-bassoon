/**
 * Application Logger Utility
 * Provides structured logging for debugging and error tracking
 * Replaces console.log/error calls with proper logging that can be
 * collected and sent to monitoring services if needed
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

const LOG_LEVELS: Record<LogLevel, LogLevel> = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

// Determine log level based on environment
const getLogLevel = (): LogLevel[] => {
  if (process.env.NODE_ENV === 'production') {
    return ['ERROR', 'WARN'];
  }
  return ['ERROR', 'WARN', 'INFO', 'DEBUG'];
};

const ENABLED_LEVELS = getLogLevel();

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level: LogLevel, message: string, data: unknown = null): string => {
  const timestamp = new Date().toISOString();
  const baseMessage = `[${timestamp}] [${level}] ${message}`;
  return data ? `${baseMessage}\n${JSON.stringify(data, null, 2)}` : baseMessage;
};

/**
 * Determine console method based on level
 */
const getConsoleMethod = (level: LogLevel): (...args: unknown[]) => void => {
  switch (level) {
    case 'ERROR':
      return console.error;
    case 'WARN':
      return console.warn;
    case 'INFO':
      return console.info;
    case 'DEBUG':
      return console.debug;
    default:
      return console.log;
  }
};

/**
 * Main logging function
 */
const log = (level: LogLevel, message: string, data: unknown = null): void => {
  if (!ENABLED_LEVELS.includes(level)) {
    return;
  }

  const formattedMessage = formatMessage(level, message, data);
  const consoleMethod = getConsoleMethod(level);

  // Log to console with styling in development
  if (process.env.NODE_ENV !== 'production') {
    const style = getStyleForLevel(level);
    consoleMethod(`%c${formattedMessage}`, style);
  } else {
    consoleMethod(formattedMessage);
  }

  // TODO: Send to monitoring service in production
  // sendToMonitoringService(level, message, data);
};

/**
 * Get CSS style for console output based on level
 */
const getStyleForLevel = (level: LogLevel): string => {
  const styles: Record<LogLevel, string> = {
    ERROR: 'color: #d32f2f; font-weight: bold;',
    WARN: 'color: #f57c00; font-weight: bold;',
    INFO: 'color: #1976d2;',
    DEBUG: 'color: #7e57c2;',
  };
  return styles[level] || '';
};

interface StateChangeParams {
  oldState: unknown;
  newState: unknown;
}

/**
 * Logger object with convenience methods
 */
const logger = {
  /**
   * Log error messages
   * Used for: Caught exceptions, API errors, failed operations
   */
  error: (message: string, data: unknown = null): void => log(LOG_LEVELS.ERROR, message, data),

  /**
   * Log warning messages
   * Used for: Validation warnings, deprecated usage, edge cases
   */
  warn: (message: string, data: unknown = null): void => log(LOG_LEVELS.WARN, message, data),

  /**
   * Log info messages
   * Used for: Important events, state changes, user actions
   */
  info: (message: string, data: unknown = null): void => log(LOG_LEVELS.INFO, message, data),

  /**
   * Log debug messages
   * Used for: Detailed debugging, component lifecycle, data flow
   * Only shown in development
   */
  debug: (message: string, data: unknown = null): void => log(LOG_LEVELS.DEBUG, message, data),

  /**
   * Log API call
   * Used for: Tracking API requests and responses
   */
  apiCall: (method: string, endpoint: string, status: number, duration: number | null = null): void => {
    const message = `API ${method} ${endpoint} - ${status}${duration ? ` (${duration}ms)` : ''}`;
    if (status >= 400) {
      logger.error(message);
    } else if (status >= 300) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  },

  /**
   * Log user action
   * Used for: Tracking user interactions
   */
  userAction: (action: string, details: unknown = null): void => {
    logger.info(`User action: ${action}`, details);
  },

  /**
   * Log component lifecycle
   * Used for: Mounting, updating, unmounting (development only)
   */
  componentLifecycle: (component: string, event: string, data: unknown = null): void => {
    logger.debug(`Component ${component} ${event}`, data);
  },

  /**
   * Log state change
   * Used for: Redux/state management updates (development only)
   */
  stateChange: (oldState: unknown, newState: unknown, trigger: string | null = null): void => {
    logger.debug(`State changed${trigger ? ` (${trigger})` : ''}`, {
      oldState,
      newState,
    });
  },

  /**
   * Log performance metric
   * Used for: Timing information, performance monitoring
   */
  performance: (metric: string, value: number, unit: string = 'ms'): void => {
    logger.info(`Performance: ${metric} = ${value}${unit}`);
  },

  /**
   * Log security event
   * Used for: Authentication, authorization, sensitive operations
   */
  security: (event: string, details: unknown = null): void => {
    logger.warn(`Security event: ${event}`, details);
  },

  /**
   * Start timing a block of code
   * Returns a function to call when done
   */
  time: (label: string): (() => void) => {
    const start = performance.now();
    return () => {
      const duration = (performance.now() - start).toFixed(2);
      logger.performance(label, parseFloat(duration), 'ms');
    };
  },
};

export default logger;
