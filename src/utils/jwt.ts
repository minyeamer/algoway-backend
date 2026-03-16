import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants';
import { JwtPayload } from '../types';

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
  } as SignOptions);

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
  } as SignOptions);

export const generatePasswordResetToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: JWT_CONFIG.PASSWORD_RESET_TOKEN_EXPIRY,
  } as SignOptions);

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};

export const verifyPasswordResetToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired password reset token');
  }
};

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
export const extractToken = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};
