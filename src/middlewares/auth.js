const { verifyAccessToken, extractToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { ERROR_CODES } = require('../config/constants');
const { query } = require('../config/database');

/**
 * JWT 인증 미들웨어
 * Access Token을 검증하고 사용자 정보를 req.user에 추가
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHORIZED,
        '인증 토큰이 필요합니다.',
        401
      );
    }

    // JWT 검증
    const decoded = verifyAccessToken(token);

    // 사용자 정보 조회 (자동 camelCase 변환)
    const result = await query(
      'SELECT user_id, email, nickname, user_type, is_verified, verification_badge FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        404
      );
    }

    // 요청 객체에 사용자 정보 추가 (이미 camelCase로 변환됨)
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(
        res,
        ERROR_CODES.TOKEN_EXPIRED,
        '토큰이 만료되었습니다. 다시 로그인해주세요.',
        401
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return errorResponse(
        res,
        ERROR_CODES.TOKEN_INVALID,
        '유효하지 않은 토큰입니다.',
        401
      );
    }

    return errorResponse(
      res,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      '인증 처리 중 오류가 발생했습니다.',
      500
    );
  }
};

/**
 * 인증 확인 미들웨어 (isVerified 체크)
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return errorResponse(
      res,
      ERROR_CODES.FORBIDDEN,
      '이메일 인증이 필요합니다.',
      403
    );
  }
  next();
};

/**
 * Optional 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      const result = await query(
        'SELECT user_id, email, nickname, user_type, is_verified, verification_badge FROM users WHERE user_id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }

    next();
  } catch (error) {
    // Optional이므로 에러가 나도 통과
    next();
  }
};

module.exports = {
  authenticateToken,
  requireVerified,
  optionalAuth
};
