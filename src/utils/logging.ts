import winston from 'winston';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

const createLogger = (component: string): winston.Logger => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { component },
    transports: [
      new winston.transports.File({ 
        filename: path.join(LOG_DIR, 'error.log'), 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: path.join(LOG_DIR, 'combined.log') 
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
};

export { createLogger };