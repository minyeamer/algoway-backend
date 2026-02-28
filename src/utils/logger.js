const winston = require('winston');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 커스텀 포맷
const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // 메타데이터가 있으면 추가
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  // 스택 트레이스가 있으면 추가
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// 로거 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [],
});

// 개발 환경: 콘솔 출력 (색상 포함)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customFormat
    ),
  }));
}

// 운영 환경: 파일 출력 (JSON 형식)
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(
      timestamp(),
      winston.format.json()
    ),
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(
      timestamp(),
      winston.format.json()
    ),
  }));
}

module.exports = logger;
