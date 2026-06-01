import winston from 'winston';

const { combine, timestamp, colorize, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    logFormat
  ),
  transports: [
    // Console — shows logs in terminal
    new winston.transports.Console(),

    // File — saves error logs to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // File — saves all logs to file
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});