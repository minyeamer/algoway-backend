'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});
type FormData = z.infer<typeof schema>;

const API_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  USER_NOT_FOUND: '등록되지 않은 이메일입니다',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 시도해주세요',
  XX000: '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요',
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const result = await login(data);
      setAuth(result.user, result.accessToken, result.refreshToken);
      router.push('/home');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      setApiError(API_ERRORS[code ?? ''] ?? '로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6">
      {/* 헤더 */}
      <header className="pt-12 pb-8">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold mt-6">로그인</h1>
        <p className="text-gray-500 text-sm mt-2">이메일과 비밀번호를 입력해 주세요</p>
      </header>

      {/* 폼 */}
      <form method="post" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
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

        {/* 비밀번호 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">비밀번호</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
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

        {/* API 에러 메시지 */}
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold mt-2 transition-colors"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* 하단 링크 */}
      <div className="flex justify-center gap-1 mt-6 text-sm text-gray-500">
        <span>계정이 없으신가요?</span>
        <Link href="/signup" className="text-brand-600 font-medium hover:underline">
          회원가입
        </Link>
      </div>
    </div>
  );
}
