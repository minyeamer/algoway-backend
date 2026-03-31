'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Briefcase,
  GraduationCap,
  Users,
  AlertCircle,
  MailCheck,
  type LucideIcon,
} from 'lucide-react';
import { sendVerificationCode, confirmVerificationCode, signup, login } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import type { UserType } from '@/types/auth';

// ─── 스키마 ─────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상이어야 합니다')
    .max(20, '닉네임은 20자 이하여야 합니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  userType: z.enum(['student', 'employee', 'others'] as const, {
    errorMap: () => ({ message: '유형을 선택해주세요' }),
  }),
});
type SignupFormData = z.infer<typeof signupSchema>;

const otpSchema = z.object({
  code: z.string().length(6, '인증 코드는 6자리입니다').regex(/^\d+$/, '숫자만 입력해주세요'),
});
type OtpFormData = z.infer<typeof otpSchema>;

// ─── 상수 ─────────────────────────────────────────────

const USER_TYPES: { value: UserType; label: string; Icon: LucideIcon }[] = [
  { value: 'student', label: '학생', Icon: GraduationCap },
  { value: 'employee', label: '직장인', Icon: Briefcase },
  { value: 'others', label: '기타', Icon: Users },
];

const API_ERRORS: Record<string, string> = {
  USER_ALREADY_EXISTS: '이미 가입된 이메일입니다',
  INVALID_CODE: '인증 코드가 올바르지 않습니다',
  CODE_EXPIRED: '인증 코드가 만료되었습니다. 코드를 재발송해 주세요',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 시도해주세요',
  XX000: '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요',
};

function getApiError(err: unknown): string {
  const code = (err as { response?: { data?: { error?: { code?: string } } } })
    ?.response?.data?.error?.code;
  return API_ERRORS[code ?? ''] ?? '오류가 발생했습니다. 다시 시도해주세요.';
}

// ─── 컴포넌트 ──────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [savedFormData, setSavedFormData] = useState<SignupFormData | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // ── 회원가입 폼 ──────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const selectedUserType = watch('userType');

  // ── OTP 폼 ───────────────────────────────────────────
  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors, isSubmitting: isOtpSubmitting },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
  });

  // ── 핸들러 ──────────────────────────────────────────

  const handleFormSubmit = async (data: SignupFormData) => {
    setApiError('');
    setIsSendingOtp(true);
    try {
      await sendVerificationCode({ email: data.email, verificationType: data.userType });
      setSavedFormData(data);
      setStep('otp');
    } catch (err) {
      setApiError(getApiError(err));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!savedFormData) return;
    setApiError('');
    setIsSendingOtp(true);
    try {
      await sendVerificationCode({ email: savedFormData.email, verificationType: savedFormData.userType });
    } catch (err) {
      setApiError(getApiError(err));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpConfirm = async ({ code }: OtpFormData) => {
    if (!savedFormData) return;
    setApiError('');
    try {
      await confirmVerificationCode({ email: savedFormData.email, verificationCode: code });
      await signup({ email: savedFormData.email, nickname: savedFormData.nickname, password: savedFormData.password });
      // 회원가입 후 자동 로그인
      const loginResult = await login({ email: savedFormData.email, password: savedFormData.password });
      setAuth(loginResult.user, loginResult.accessToken, loginResult.refreshToken);
      router.push('/home');
    } catch (err) {
      setApiError(getApiError(err));
    }
  };

  // ── OTP 입력 화면 ─────────────────────────────────────

  if (step === 'otp') {
    return (
      <div className="flex flex-col min-h-screen px-6">
        <header className="pt-12 pb-8">
          <button onClick={() => { setStep('form'); setApiError(''); }} className="p-1 -ml-1 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mt-6 mb-4">
            <MailCheck size={24} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold">이메일 인증</h1>
          <p className="text-gray-500 text-sm mt-2">
            <span className="font-medium text-gray-700">{savedFormData?.email}</span>으로{' '}
            발송된 6자리 코드를 입력해 주세요
          </p>
        </header>

        <form method="post" className="flex flex-col gap-4" onSubmit={handleOtpSubmit(handleOtpConfirm)}>
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6자리 숫자"
              autoComplete="one-time-code"
              {...registerOtp('code')}
              className="w-full text-center tracking-[0.4em] py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {otpErrors.code && (
              <p className="text-xs text-red-500 mt-1.5">{otpErrors.code.message}</p>
            )}
          </div>

          {apiError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isOtpSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold transition-colors"
          >
            {isOtpSubmitting ? '확인 중...' : '인증 확인'}
          </button>

          <button
            type="button"
            disabled={isSendingOtp}
            onClick={handleResendOtp}
            className="text-sm text-center text-brand-600 hover:underline disabled:text-gray-400"
          >
            {isSendingOtp ? '발송 중...' : '코드 재발송'}
          </button>
        </form>
      </div>
    );
  }

  // ── 회원가입 폼 화면 ──────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen px-6 pb-10">
      <header className="pt-12 pb-6">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold mt-6">회원가입</h1>
        <p className="text-gray-500 text-sm mt-2">카풀 매칭을 시작해 볼까요?</p>
      </header>

      <form method="post" className="flex flex-col gap-5" onSubmit={handleSubmit(handleFormSubmit)}>
        {/* 이메일 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">이메일</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              {...register('email')}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
          )}
        </div>

        {/* 닉네임 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">닉네임</label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="2~20자"
              autoComplete="nickname"
              maxLength={20}
              {...register('nickname')}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          {errors.nickname && (
            <p className="text-xs text-red-500 mt-1.5">{errors.nickname.message}</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">비밀번호</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="8자 이상"
              autoComplete="new-password"
              {...register('password')}
              className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
          )}
        </div>

        {/* 유형 선택 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">유형</label>
          {/* hidden input for react-hook-form validation */}
          <input type="hidden" {...register('userType')} />
          <div className="grid grid-cols-3 gap-2">
            {USER_TYPES.map(({ value, label, Icon }) => {
              const isSelected = selectedUserType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('userType', value, { shouldValidate: true })}
                  className={[
                    'flex flex-col items-center gap-1.5 py-3.5 rounded-xl border text-sm transition-colors',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-600 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300',
                  ].join(' ')}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          {errors.userType && (
            <p className="text-xs text-red-500 mt-1.5">{errors.userType.message}</p>
          )}
        </div>

        {/* API 에러 메시지 */}
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* 가입 버튼 */}
        <button
          type="submit"
          disabled={isFormSubmitting || isSendingOtp}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold mt-2 transition-colors"
        >
          {isFormSubmitting || isSendingOtp ? '처리 중...' : '가입하기'}
        </button>
      </form>

      {/* 하단 링크 */}
      <div className="flex justify-center gap-1 mt-6 text-sm text-gray-500">
        <span>이미 계정이 있으신가요?</span>
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
