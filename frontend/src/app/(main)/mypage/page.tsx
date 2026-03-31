'use client';

import { useRouter } from 'next/navigation';
import { User, Star, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { logout } from '@/lib/api/auth';

const USER_TYPE_LABEL: Record<string, string> = {
  student: '학생',
  employee: '직장인',
  others: '기타',
};

export default function MyPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    router.push('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
      </header>

      {/* 프로필 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center">
            <User size={28} className="text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-lg">{user?.nickname ?? '-'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email ?? '-'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full">
              {USER_TYPE_LABEL[user?.userType ?? ''] ?? '기타'}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <Star size={16} className="text-yellow-500 fill-yellow-400" />
          <span className="text-sm font-medium text-gray-700">매너 점수</span>
          <span className="ml-auto text-sm font-semibold text-gray-900">
            {user?.mannerScore?.toFixed(1) ?? '5.0'}
          </span>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
          <Settings size={20} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">설정</span>
          <ChevronRight size={16} className="ml-auto text-gray-400" />
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={20} className="text-red-500" />
          <span className="text-sm font-medium text-red-500">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
