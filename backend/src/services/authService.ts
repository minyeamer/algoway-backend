import bcrypt from 'bcryptjs';
import { query, transaction } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendWelcomeEmail } from './emailService';
import { VERIFICATION_CODE, ERROR_CODES } from '../config/constants';
import redis from '../config/redis';
import logger from '../utils/logger';
import type { SignupResult, LoginResult, VerifyResult, TokenPair } from '../types';

const BADGE_MAP: Record<string, string> = {
  student: '학생 인증',
  employee: '직장인 인증',
  others: '일반 인증',
};

const generateVerificationCode = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

interface UserRow {
  userId: string;
  email: string;
  passwordHash: string;
  nickname: string;
  userType: string;
  isVerified: boolean;
  verificationBadge: string | null;
}

interface VerificationRow {
  codeId: string;
  verificationType: string;
}

interface TokenRow {
  tokenId: string;
  userId: string;
  expiresAt: Date;
}

/**
 * 회원가입
 */
export const signup = async (
  email: string,
  password: string,
  nickname: string
): Promise<SignupResult> => {
  const verifiedType = await redis.get(`email_verified:${email}`);

  if (!verifiedType) {
    const error = Object.assign(new Error('이메일 인증을 먼저 완료해주세요.'), {
      code: ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    });
    throw error;
  }

  const existingUser = await query('SELECT user_id FROM users WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    const error = Object.assign(new Error('이미 가입된 이메일입니다.'), {
      code: ERROR_CODES.ALREADY_EXISTS,
      statusCode: 409,
    });
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const badge = BADGE_MAP[verifiedType] ?? '일반 인증';

  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, user_type, nickname, is_verified, verification_badge)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     RETURNING user_id, email, nickname, user_type, is_verified, verification_badge, created_at`,
    [email, passwordHash, verifiedType, nickname, badge]
  );

  const user = result.rows[0];

  await redis.del(`email_verified:${email}`);

  sendWelcomeEmail(email, nickname).catch((err: Error) => {
    logger.error('환영 이메일 전송 실패:', err);
  });

  return {
    userId: user.userId,
    email: user.email,
    nickname: user.nickname,
    userType: user.userType,
    isVerified: user.isVerified,
    verificationBadge: user.verificationBadge,
  };
};

/**
 * 로그인
 */
export const login = async (email: string, password: string): Promise<LoginResult> => {
  const result = await query<UserRow>(
    `SELECT user_id, email, password_hash, nickname, user_type, is_verified, verification_badge
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    const error = Object.assign(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'), {
      code: ERROR_CODES.INVALID_CREDENTIALS,
      statusCode: 401,
    });
    throw error;
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = Object.assign(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'), {
      code: ERROR_CODES.INVALID_CREDENTIALS,
      statusCode: 401,
    });
    throw error;
  }

  const accessToken = generateAccessToken({ userId: user.userId });
  const refreshToken = generateRefreshToken({ userId: user.userId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
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
      verificationBadge: user.verificationBadge,
    },
  };
};

/**
 * 인증 코드 발송
 */
export const sendVerificationCode = async (
  email: string,
  verificationType: string
): Promise<{ success: boolean; expiresIn: number }> => {
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + VERIFICATION_CODE.EXPIRY_MINUTES);

  await query(
    'INSERT INTO verification_codes (email, code, verification_type, expires_at) VALUES ($1, $2, $3, $4)',
    [email, code, verificationType, expiresAt]
  );

  await sendVerificationEmail(email, code, verificationType);

  return { success: true, expiresIn: VERIFICATION_CODE.EXPIRY_MINUTES };
};

/**
 * 인증 코드 확인
 */
export const confirmVerificationCode = async (
  email: string,
  verificationCode: string
): Promise<VerifyResult> => {
  const result = await query<VerificationRow>(
    `SELECT code_id, verification_type
     FROM verification_codes
     WHERE email = $1 AND code = $2 AND expires_at > NOW() AND is_used = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, verificationCode]
  );

  if (result.rows.length === 0) {
    const error = Object.assign(new Error('유효하지 않거나 만료된 인증 코드입니다.'), {
      code: ERROR_CODES.INVALID_INPUT,
      statusCode: 400,
    });
    throw error;
  }

  const verification = result.rows[0];
  const badge = BADGE_MAP[verification.verificationType] ?? '일반 인증';

  await query('UPDATE verification_codes SET is_used = TRUE WHERE code_id = $1', [
    verification.codeId,
  ]);

  await redis.set(`email_verified:${email}`, verification.verificationType, 3600);

  return {
    isVerified: true,
    badge,
    verifiedAt: new Date().toISOString(),
  };
};

/**
 * 토큰 갱신
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const error = Object.assign(new Error('유효하지 않은 리프레시 토큰입니다.'), {
      code: ERROR_CODES.TOKEN_INVALID,
      statusCode: 401,
    });
    throw error;
  }

  const result = await query<TokenRow>(
    'SELECT token_id, user_id, expires_at FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refreshToken]
  );

  if (result.rows.length === 0) {
    const error = Object.assign(new Error('만료되었거나 유효하지 않은 리프레시 토큰입니다.'), {
      code: ERROR_CODES.TOKEN_EXPIRED,
      statusCode: 401,
    });
    throw error;
  }

  const tokenData = result.rows[0];
  const newAccessToken = generateAccessToken({ userId: tokenData.userId });
  const newRefreshToken = generateRefreshToken({ userId: tokenData.userId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await transaction(async (client) => {
    await client.query('DELETE FROM refresh_tokens WHERE token_id = $1', [tokenData.tokenId]);
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [tokenData.userId, newRefreshToken, expiresAt]
    );
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * 로그아웃
 */
export const logout = async (refreshToken: string): Promise<void> => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
};
