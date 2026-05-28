import pino from 'pino';

const env = process.env.NODE_ENV;

export const logger = pino({
  level: env === 'production' ? 'info' : env === 'test' ? 'silent' : 'debug',
  transport: env === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
