import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import { ERROR_CODES } from '../config/constants';
import { query } from '../config/database';

/**
 * JWT 인증 미들웨어
 * Access Token을 검증하고 사용자 정보를 req.user에 추가
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      errorResponse(res, ERROR_CODES.UNAUTHORIZED, '인증 토큰이 필요합니다.', 401);
      return;
    }

    const decoded = verifyAccessToken(token);

    const result = await query<{
      userId: string;
      email: string;
      nickname: string;
      userType: string;
      isVerified: boolean;
      verificationBadge: string | null;
    }>(
      'SELECT user_id, email, nickname, user_type, is_verified, verification_badge FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, ERROR_CODES.NOT_FOUND, '사용자를 찾을 수 없습니다.', 404);
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    const err = error as Error;

    if (err.name === 'TokenExpiredError') {
      errorResponse(res, ERROR_CODES.TOKEN_EXPIRED, '토큰이 만료되었습니다. 다시 로그인해주세요.', 401);
      return;
    }

    if (err.name === 'JsonWebTokenError') {
      errorResponse(res, ERROR_CODES.TOKEN_INVALID, '유효하지 않은 토큰입니다.', 401);
      return;
    }

    errorResponse(res, ERROR_CODES.INTERNAL_SERVER_ERROR, '인증 처리 중 오류가 발생했습니다.', 500);
  }
};

/**
 * 이메일 인증 확인 미들웨어
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isVerified) {
    errorResponse(res, ERROR_CODES.FORBIDDEN, '이메일 인증이 필요합니다.', 403);
    return;
  }
  next();
};

/**
 * Optional 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      const result = await query<{
        userId: string;
        email: string;
        nickname: string;
        userType: string;
        isVerified: boolean;
        verificationBadge: string | null;
      }>(
        'SELECT user_id, email, nickname, user_type, is_verified, verification_badge FROM users WHERE user_id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }

    next();
  } catch {
    next();
  }
};
