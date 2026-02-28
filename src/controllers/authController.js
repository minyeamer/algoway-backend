const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

/**
 * 회원가입
 * POST /v1/auth/signup
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, userType, nickname } = req.body;

    const user = await authService.signup(email, password, userType, nickname);

    return successResponse(
      res,
      user,
      '회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 로그인
 * POST /v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 발송
 * POST /v1/auth/verify/send
 */
const sendVerificationCode = async (req, res, next) => {
  try {
    const { email, verificationType } = req.body;

    await authService.sendVerificationCode(email, verificationType);

    return successResponse(res, null, '인증 코드가 발송되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 확인
 * POST /v1/auth/verify/confirm
 * (인증된 사용자만 접근 가능)
 */
const confirmVerificationCode = async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;
    const userId = req.user.userId; // camelCase로 변환된 상태

    const result = await authService.confirmVerificationCode(userId, email, verificationCode);

    return successResponse(res, result, '인증이 완료되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 토큰 갱신
 * POST /v1/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refreshAccessToken(refreshToken);

    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 로그아웃
 * POST /v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    return successResponse(res, null, '로그아웃되었습니다.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  sendVerificationCode,
  confirmVerificationCode,
  refreshToken,
  logout
};
