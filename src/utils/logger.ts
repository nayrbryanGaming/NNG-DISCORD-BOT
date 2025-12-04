import winston, { Logger } from 'winston';
import { db } from '../index';

const logLevel = process.env.LOG_LEVEL || 'info';

// Winston logger for console output
export const logger: Logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});

// Save logs to database
export async function saveLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  category: string,
  message: string,
  metadata?: Record<string, any>
) {
  try {
    await db.systemLog.create({
      data: {
        level,
        category,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    logger.error('Failed to save log to database', { error });
  }
}

// Convenience functions
export const log = {
  debug: (msg: string, meta?: Record<string, any>) => {
    logger.debug(msg, meta);
    saveLog('debug', 'general', msg, meta);
  },
  info: (msg: string, meta?: Record<string, any>) => {
    logger.info(msg, meta);
    saveLog('info', 'general', msg, meta);
  },
  warn: (msg: string, meta?: Record<string, any>) => {
    logger.warn(msg, meta);
    saveLog('warn', 'general', msg, meta);
  },
  error: (msg: string, meta?: Record<string, any>) => {
    logger.error(msg, meta);
    saveLog('error', 'general', msg, meta);
  }
};
