export type UserType = 'student' | 'employee' | 'others';

export interface User {
  userId: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  userType: UserType;
  isVerified: boolean;
  mannerScore: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

// 회원가입 요청
export interface SignupRequest {
  email: string;
  nickname: string;
  password: string;
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// 인증 코드 발송 요청
export interface SendVerifyRequest {
  email: string;
  verificationType: UserType;  // 'student' | 'employee' | 'others'
}

// 인증 코드 확인 요청
export interface ConfirmVerifyRequest {
  email: string;
  verificationCode: string;
}
