import winston from 'winston';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create transports array based on environment
const transports: winston.transport[] = [];

// Always add console transport
transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Only add file transports in development or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' 
      ? winston.format.json()
      : winston.format.simple()
  ),
  defaultMeta: { service: 'fuelprice-pro-backend' },
  transports
});