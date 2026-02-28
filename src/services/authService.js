const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendWelcomeEmail } = require('./emailService');
const { keysToSnake } = require('../utils/caseConverter');
const { VERIFICATION_CODE, ERROR_CODES } = require('../config/constants');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const BADGE_MAP = {
  student: '학생 인증',
  employee: '직장인 인증',
  others: '일반 인증'
};

/**
 * 인증 코드 생성 (6자리 숫자)
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 회원가입
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 * @param {string} userType - 사용자 유형 (student, employee, others)
 * @param {string} nickname - 닉네임
 * @returns {Object} 생성된 사용자 정보 (camelCase)
 */
const signup = async (email, password, nickname) => {
  // 이메일 인증 완료 여부 확인 (verify/confirm 후 Redis에 저장된 값)
  const verifiedType = await redis.get(`email_verified:${email}`);

  if (!verifiedType) {
    const error = new Error('이메일 인증을 먼저 완료해주세요.');
    error.code = ERROR_CODES.FORBIDDEN;
    error.statusCode = 403;
    throw error;
  }

  // 이메일 중복 체크
  const existingUser = await query(
    'SELECT user_id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    const error = new Error('이미 가입된 이메일입니다.');
    error.code = ERROR_CODES.ALREADY_EXISTS;
    error.statusCode = 409;
    throw error;
  }

  // 비밀번호 해싱
  const passwordHash = await bcrypt.hash(password, 10);

  const badge = BADGE_MAP[verifiedType] || '일반 인증';

  // 이미 인증된 상태로 사용자 생성 (database.js가 자동으로 camelCase로 변환)
  const result = await query(
    `INSERT INTO users (email, password_hash, user_type, nickname, is_verified, verification_badge)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     RETURNING user_id, email, nickname, user_type, is_verified, verification_badge, created_at`,
    [email, passwordHash, verifiedType, nickname, badge]
  );

  const user = result.rows[0]; // 이미 camelCase로 변환됨

  // Redis 인증 키 삭제
  await redis.del(`email_verified:${email}`);

  // 환영 이메일 전송 (비동기, 실패해도 괜찮음)
  sendWelcomeEmail(email, nickname).catch(err => {
    logger.error('환영 이메일 전송 실패:', err);
  });

  return {
    userId: user.userId,
    email: user.email,
    nickname: user.nickname,
    userType: user.userType,
    isVerified: user.isVerified,
    verificationBadge: user.verificationBadge
  };
};

/**
 * 로그인
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 * @returns {Object} 토큰 및 사용자 정보
 */
const login = async (email, password) => {
  // 사용자 조회 (자동 camelCase 변환)
  const result = await query(
    `SELECT user_id, email, password_hash, nickname, user_type, is_verified, verification_badge
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    const error = new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    error.code = ERROR_CODES.INVALID_CREDENTIALS;
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0]; // camelCase로 변환됨

  // 비밀번호 검증
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    error.code = ERROR_CODES.INVALID_CREDENTIALS;
    error.statusCode = 401;
    throw error;
  }

  // JWT 토큰 생성
  const accessToken = generateAccessToken({ userId: user.userId });
  const refreshToken = generateRefreshToken({ userId: user.userId });

  // 리프레시 토큰 저장 (expires_at은 snake_case 그대로 사용)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user.userId, refreshToken, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
      userType: user.userType,
      isVerified: user.isVerified,
      verificationBadge: user.verificationBadge
    }
  };
};

/**
 * 인증 코드 발송
 * @param {string} email - 이메일
 * @param {string} verificationType - 인증 유형 (student, employee, others)
 * @returns {Object} 발송 성공 정보
 */
const sendVerificationCode = async (email, verificationType) => {
  // 인증 코드 생성
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + VERIFICATION_CODE.EXPIRY_MINUTES);

  // 인증 코드 저장
  await query(
    `INSERT INTO verification_codes (email, code, verification_type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email, code, verificationType, expiresAt]
  );

  // 이메일 전송
  await sendVerificationEmail(email, code, verificationType);

  return {
    success: true,
    expiresIn: VERIFICATION_CODE.EXPIRY_MINUTES
  };
};

/**
 * 인증 코드 확인
 * @param {string} email - 이메일
 * @param {string} verificationCode - 인증 코드
 * @returns {Object} 인증 완료 정보
 */
const confirmVerificationCode = async (email, verificationCode) => {
  // 유효한 인증 코드 조회 (자동 camelCase 변환)
  const result = await query(
    `SELECT code_id, verification_type
     FROM verification_codes
     WHERE email = $1 
       AND code = $2 
       AND expires_at > NOW() 
       AND is_used = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, verificationCode]
  );

  if (result.rows.length === 0) {
    const error = new Error('유효하지 않거나 만료된 인증 코드입니다.');
    error.code = ERROR_CODES.INVALID_INPUT;
    error.statusCode = 400;
    throw error;
  }

  const verification = result.rows[0]; // camelCase로 변환됨
  const badge = BADGE_MAP[verification.verificationType] || '일반 인증';

  // 인증 코드 사용 처리
  await query(
    'UPDATE verification_codes SET is_used = TRUE WHERE code_id = $1',
    [verification.codeId]
  );

  // 인증된 이메일을 Redis에 저장 (1시간 유효 — 이 안에 회원가입 완료해야 함)
  await redis.set(`email_verified:${email}`, verification.verificationType, 3600);

  return {
    isVerified: true,
    badge,
    verifiedAt: new Date().toISOString()
  };
};

/**
 * 토큰 갱신
 * @param {string} refreshToken - 리프레시 토큰
 * @returns {Object} 새로운 토큰 쌍
 */
const refreshAccessToken = async (refreshToken) => {
  // 리프레시 토큰 JWT 검증
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    const err = new Error('유효하지 않은 리프레시 토큰입니다.');
    err.code = ERROR_CODES.TOKEN_INVALID;
    err.statusCode = 401;
    throw err;
  }

  // DB에서 리프레시 토큰 확인 (자동 camelCase 변환)
  const result = await query(
    `SELECT token_id, user_id, expires_at
     FROM refresh_tokens
     WHERE token = $1 AND expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    const error = new Error('만료되었거나 유효하지 않은 리프레시 토큰입니다.');
    error.code = ERROR_CODES.TOKEN_EXPIRED;
    error.statusCode = 401;
    throw error;
  }

  const tokenData = result.rows[0]; // camelCase로 변환됨

  // 새로운 토큰 생성
  const newAccessToken = generateAccessToken({ userId: tokenData.userId });
  const newRefreshToken = generateRefreshToken({ userId: tokenData.userId });

  // 기존 리프레시 토큰 삭제 및 새 토큰 저장
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await transaction(async (client) => {
    // 기존 토큰 삭제
    await client.query(
      'DELETE FROM refresh_tokens WHERE token_id = $1',
      [tokenData.tokenId]
    );

    // 새 토큰 저장
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [tokenData.userId, newRefreshToken, expiresAt]
    );
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};

/**
 * 로그아웃 (리프레시 토큰 삭제)
 * @param {string} refreshToken - 리프레시 토큰
 * @returns {Object} 성공 여부
 */
const logout = async (refreshToken) => {
  await query(
    'DELETE FROM refresh_tokens WHERE token = $1',
    [refreshToken]
  );

  return { success: true };
};

module.exports = {
  signup,
  login,
  sendVerificationCode,
  confirmVerificationCode,
  refreshAccessToken,
  logout
};
