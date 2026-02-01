// Structured logger with log levels and context formatting
// Provides consistent logging across the application

// Log levels in order of severity
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// Context object for structured logging
export interface LogContext {
  [key: string]: unknown;
}

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// Current log level threshold (can be configured via environment)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get minimum log level from environment or default to DEBUG
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "INFO" : "DEBUG";
}

// Check if a log level should be logged based on minimum threshold
function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

// Format timestamp in ISO format
function getTimestamp(): string {
  return new Date().toISOString();
}

// Format log entry for output
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry;
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

// Serialize error objects for logging
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { error: String(error) };
}

// Process context to serialize errors
function processContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const processed: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      processed[key] = serializeError(value);
    } else {
      processed[key] = value;
    }
  }
  return processed;
}

// Core logging function
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    context: processContext(context),
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case "DEBUG":
      console.debug(formatted);
      break;
    case "INFO":
      console.info(formatted);
      break;
    case "WARN":
      console.warn(formatted);
      break;
    case "ERROR":
      console.error(formatted);
      break;
  }
}

// Public API matching console.* pattern with context support
export const logger = {
  // Debug level logging for development information
  debug: (message: string, context?: LogContext): void => {
    log("DEBUG", message, context);
  },

  // Info level logging for general operational information
  info: (message: string, context?: LogContext): void => {
    log("INFO", message, context);
  },

  // Warn level logging for potentially harmful situations
  warn: (message: string, context?: LogContext): void => {
    log("WARN", message, context);
  },

  // Error level logging for error events
  error: (message: string, context?: LogContext): void => {
    log("ERROR", message, context);
  },

  // Log with explicit level specification
  log: (level: LogLevel, message: string, context?: LogContext): void => {
    log(level, message, context);
  },
};

export default logger;
