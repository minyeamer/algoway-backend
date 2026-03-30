import { Request, Response, NextFunction, RequestHandler } from 'express';
import { errorResponse } from '../utils/response';
import { ERROR_CODES } from '../config/constants';
import logger from '../utils/logger';

interface PgError extends Error {
  code?: string;
  detail?: string;
}

interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
  isJoi?: boolean;
}

/**
 * 404 Not Found 핸들러
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  errorResponse(
    res,
    ERROR_CODES.NOT_FOUND,
    `요청하신 경로 ${req.originalUrl}를 찾을 수 없습니다.`,
    404
  );
};

/**
 * 전역 에러 핸들러
 */
export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  const pgErr = err as PgError;

  // PostgreSQL 에러
  if (typeof pgErr.code === 'string' && pgErr.code.startsWith('23')) {
    if (pgErr.code === '23505') {
      errorResponse(
        res,
        ERROR_CODES.ALREADY_EXISTS,
        '이미 존재하는 데이터입니다.',
        409,
        isDevelopment ? { detail: pgErr.detail } : null
      );
      return;
    }

    if (pgErr.code === '23503') {
      errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        '참조하는 데이터를 찾을 수 없습니다.',
        400,
        isDevelopment ? { detail: pgErr.detail } : null
      );
      return;
    }
  }

  // Validation 에러
  if (err.name === 'ValidationError' || err.isJoi) {
    errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      '입력 데이터 검증에 실패했습니다.',
      400,
      isDevelopment ? { errors: err.details } : null
    );
    return;
  }

  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    errorResponse(res, ERROR_CODES.TOKEN_INVALID, '유효하지 않은 토큰입니다.', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse(res, ERROR_CODES.TOKEN_EXPIRED, '토큰이 만료되었습니다.', 401);
    return;
  }

  // 기본 에러 응답
  errorResponse(
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
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | void
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
