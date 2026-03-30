import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { successResponse } from '../utils/response';

/**
 * 회원가입
 * POST /v1/auth/signup
 */
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, nickname } = req.body as {
      email: string;
      password: string;
      nickname: string;
    };

    const user = await authService.signup(email, password, nickname);
    successResponse(res, user, '회원가입이 완료되었습니다.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 로그인
 * POST /v1/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const result = await authService.login(email, password);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 발송
 * POST /v1/auth/verify/send
 */
export const sendVerificationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, verificationType } = req.body as {
      email: string;
      verificationType: string;
    };

    await authService.sendVerificationCode(email, verificationType);
    successResponse(res, null, '인증 코드가 재발송되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 확인
 * POST /v1/auth/verify/confirm
 */
export const confirmVerificationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, verificationCode } = req.body as {
      email: string;
      verificationCode: string;
    };

    const result = await authService.confirmVerificationCode(email, verificationCode);
    successResponse(res, result, '인증이 완료되었습니다.');
  } catch (error) {
    next(error);
  }
};

/**
 * 토큰 갱신
 * POST /v1/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };

    const result = await authService.refreshAccessToken(token);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 로그아웃
 * POST /v1/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };

    await authService.logout(token);
    successResponse(res, null, '로그아웃되었습니다.');
  } catch (error) {
    next(error);
  }
};
