const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const {
  signupValidation,
  loginValidation,
  sendVerificationValidation,
  confirmVerificationValidation,
  refreshTokenValidation
} = require('../middlewares/validator');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * 회원가입
 * POST /v1/auth/signup
 */
router.post(
  '/signup',
  signupValidation,
  asyncHandler(authController.signup)
);

/**
 * 로그인
 * POST /v1/auth/login
 */
router.post(
  '/login',
  loginValidation,
  asyncHandler(authController.login)
);

/**
 * 이메일 인증 코드 발송
 * POST /v1/auth/verify/send
 */
router.post(
  '/verify/send',
  sendVerificationValidation,
  asyncHandler(authController.sendVerificationCode)
);

/**
 * 이메일 인증 코드 확인
 * POST /v1/auth/verify/confirm
 */
router.post(
  '/verify/confirm',
  confirmVerificationValidation,
  asyncHandler(authController.confirmVerificationCode)
);

/**
 * 토큰 갱신
 * POST /v1/auth/refresh
 */
router.post(
  '/refresh',
  refreshTokenValidation,
  asyncHandler(authController.refreshToken)
);

/**
 * 로그아웃
 * POST /v1/auth/logout
 */
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(authController.logout)
);

module.exports = router;
