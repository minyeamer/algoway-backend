const { errorResponse } = require('../utils/response');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * 404 Not Found 핸들러
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(
    res,
    ERROR_CODES.NOT_FOUND,
    `요청하신 경로 ${req.originalUrl}를 찾을 수 없습니다.`,
    404
  );
};

/**
 * 전역 에러 핸들러
 */
const globalErrorHandler = (err, req, res, next) => {
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // 개발 환경에서만 스택 트레이스 노출
  const isDevelopment = process.env.NODE_ENV === 'development';

  // PostgreSQL 에러
  if (err.code && typeof err.code === 'string' && err.code.startsWith('23')) {
    if (err.code === '23505') { // unique violation
      return errorResponse(
        res,
        ERROR_CODES.ALREADY_EXISTS,
        '이미 존재하는 데이터입니다.',
        409,
        isDevelopment ? { detail: err.detail } : null
      );
    }

    if (err.code === '23503') { // foreign key violation
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        '참조하는 데이터를 찾을 수 없습니다.',
        400,
        isDevelopment ? { detail: err.detail } : null
      );
    }
  }

  // Validation 에러
  if (err.name === 'ValidationError' || err.isJoi) {
    return errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      '입력 데이터 검증에 실패했습니다.',
      400,
      isDevelopment ? { errors: err.details || err.errors } : null
    );
  }

  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(
      res,
      ERROR_CODES.TOKEN_INVALID,
      '유효하지 않은 토큰입니다.',
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res,
      ERROR_CODES.TOKEN_EXPIRED,
      '토큰이 만료되었습니다.',
      401
    );
  }

  // 기본 에러 응답
  return errorResponse(
    res,
    err.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
    err.message || '서버 내부 오류가 발생했습니다.',
    err.statusCode || 500,
    isDevelopment ? { stack: err.stack } : null
  );
};

/**
 * Async 핸들러 래퍼 (try-catch 자동화)
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
  asyncHandler
};
