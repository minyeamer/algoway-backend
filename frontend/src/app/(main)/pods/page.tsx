'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Plus, Clock, Users, Loader2 } from 'lucide-react';
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

export default function PodsPage() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPods()
      .then(setPods)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">내 팟</h1>
        <Link
          href="/pods/create"
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg"
        >
          <Plus size={16} />
          <span>만들기</span>
        </Link>
      </header>

      <div className="flex-1 px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : pods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Car size={30} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">참여 중인 팟이 없어요</p>
            <p className="text-sm text-gray-400 mt-1">팟을 만들거나 검색해 보세요</p>
            <Link
              href="/pods/create"
              className="mt-5 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl"
            >
              팟 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pods.map((pod) => (
              <Link
                key={pod.podId}
                href={`/pods/${pod.podId}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">
                    {pod.departurePlace.name} → {pod.arrivalPlace.name}
                  </p>
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
      </div>
    </div>
  );
}
