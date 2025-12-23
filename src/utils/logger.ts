import chalk from 'chalk';
import type { Logger, LogLevel } from '../types/index.js';

let currentLogLevel: LogLevel = 'info';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
};

const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `[${timestamp}]`;

  switch (level) {
    case 'debug':
      return chalk.gray(`${prefix} [DEBUG] ${message}`);
    case 'info':
      return chalk.blue(`${prefix} [INFO] ${message}`);
    case 'warn':
      return chalk.yellow(`${prefix} [WARN] ${message}`);
    case 'error':
      return chalk.red(`${prefix} [ERROR] ${message}`);
  }
};

export const logger: Logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
    }
  },
};

// Simple output helpers without timestamps (for CLI output)
export const output = {
  success: (message: string) => console.log(chalk.green(`✓ ${message}`)),
  error: (message: string) => console.log(chalk.red(`✗ ${message}`)),
  info: (message: string) => console.log(chalk.cyan(`ℹ ${message}`)),
  warn: (message: string) => console.log(chalk.yellow(`⚠ ${message}`)),
  dim: (message: string) => console.log(chalk.dim(message)),
  bold: (message: string) => console.log(chalk.bold(message)),
  newline: () => console.log(),
};
