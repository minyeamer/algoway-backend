const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/constants');

/**
 * Access Token 생성
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Refresh Token 생성
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * 비밀번호 재설정 토큰 생성
 */
const generatePasswordResetToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: JWT_CONFIG.PASSWORD_RESET_TOKEN_EXPIRY }
  );
};

/**
 * Access Token 검증
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Refresh Token 검증
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * 비밀번호 재설정 토큰 검증
 */
const verifyPasswordResetToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired password reset token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
};
