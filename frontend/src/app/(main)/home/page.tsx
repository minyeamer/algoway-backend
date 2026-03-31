'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Car, Clock, ChevronRight, Bell, Users, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { fetchMyPods } from '@/lib/api/pods';
import type { PodSummary } from '@/types/pod';

const STATUS_LABEL: Record<string, string> = {
  recruiting: '모집 중',
  full: '모집 완료',
  in_progress: '이동 중',
  completed: '완료',
  cancelled: '취소됨',
};

const STATUS_COLOR: Record<string, string> = {
  recruiting: 'bg-green-100 text-green-700',
  full: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [myPods, setMyPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPods()
      .then(setMyPods)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '안녕하세요';
    return '좋은 저녁이에요';
  })();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{greeting} 👋</p>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">
              {user?.nickname ?? '사용자'}님
            </h1>
          </div>
          <button
            onClick={() => router.push('/mypage')}
            className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center"
          >
            <Bell size={20} className="text-brand-600" />
          </button>
        </div>

        {/* 검색 바 */}
        <button
          onClick={() => router.push('/search')}
          className="mt-4 w-full h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3 px-4 text-sm text-gray-400 hover:border-brand-300 transition-colors"
        >
          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
          <span>출발지 · 도착지를 입력하세요</span>
        </button>
      </header>

      <div className="flex-1 px-4 py-5 space-y-5">
        {/* 빠른 실행 */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">빠른 실행</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/pods/create"
              className="bg-brand-600 rounded-2xl p-4 text-white flex flex-col gap-2"
            >
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus size={20} />
              </div>
              <p className="font-semibold text-sm">팟 만들기</p>
              <p className="text-xs text-brand-100">새로운 카풀팟을 개설해요</p>
            </Link>
            <Link
              href="/search"
              className="bg-white border border-gray-200 rounded-2xl p-4 text-gray-700 flex flex-col gap-2"
            >
              <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                <Car size={20} className="text-brand-600" />
              </div>
              <p className="font-semibold text-sm">팟 찾기</p>
              <p className="text-xs text-gray-400">내 경로의 팟을 찾아요</p>
            </Link>
          </div>
        </section>

        {/* 내 팟 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">내 팟</h2>
            <Link href="/pods" className="flex items-center gap-0.5 text-sm text-brand-600">
              전체보기 <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : myPods.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Car size={28} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-700">참여 중인 팟이 없어요</p>
              <p className="text-sm text-gray-400 mt-1">팟을 만들거나 참여해 보세요</p>
              <Link
                href="/pods/create"
                className="mt-4 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl"
              >
                팟 만들기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myPods.map((pod) => (
                <Link
                  key={pod.podId}
                  href={`/pods/${pod.podId}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {pod.departurePlace.name} → {pod.arrivalPlace.name}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[pod.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[pod.status] ?? pod.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(pod.departureTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {pod.currentParticipants}/{pod.maxParticipants}명
                    </span>
                    <span className="flex items-center gap-1">
                      <Car size={12} />
                      {pod.vehicleType === 'taxi' ? '택시' : '개인차량'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 최근 이용 경로 */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">최근 이용 경로</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Clock size={22} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">이용 기록이 없어요</p>
          </div>
        </section>
      </div>

      {/* 팟 만들기 FAB */}
      <Link
        href="/pods/create"
        className="fixed bottom-24 right-4 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 transition-colors z-40"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
