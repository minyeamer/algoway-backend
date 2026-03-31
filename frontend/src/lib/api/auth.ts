import apiClient from './client';
import type {
  SignupRequest,
  LoginRequest,
  LoginResponse,
  SendVerifyRequest,
  ConfirmVerifyRequest,
  AuthTokens,
  User,
} from '@/types/auth';
import type { ApiResponse } from '@/types/api';

export const sendVerificationCode = async (body: SendVerifyRequest) => {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/verify/send', body);
  return data;
};

export const confirmVerificationCode = async (body: ConfirmVerifyRequest) => {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/verify/confirm', body);
  return data;
};

export const signup = async (body: SignupRequest) => {
  const { data } = await apiClient.post<ApiResponse<User>>('/auth/signup', body);
  return data.data;
};

export const login = async (body: LoginRequest) => {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', body);
  return data.data;
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
};

export const refreshToken = async (token: string) => {
  const { data } = await apiClient.post<ApiResponse<AuthTokens & { refreshToken: string }>>('/auth/refresh', { refreshToken: token });
  return data.data;
};
