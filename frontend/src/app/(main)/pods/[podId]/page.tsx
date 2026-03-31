'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, MapPin, Clock, Users, Car, MessageCircle,
  LogOut, CheckCircle, AlertCircle, Loader2, Navigation,
} from 'lucide-react';
import { fetchPodById, joinPod, leavePod } from '@/lib/api/pods';
import { useAuthStore } from '@/store/authStore';
import type { PodDetail, PodStatus, VehicleType } from '@/types/pod';

const STATUS_MAP: Record<PodStatus, { label: string; color: string }> = {
  recruiting: { label: '모집 중', color: 'bg-green-100 text-green-700' },
  full: { label: '모집 완료', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '이동 중', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '취소됨', color: 'bg-red-100 text-red-600' },
};

const VEHICLE_MAP: Record<VehicleType, string> = {
  taxi: '택시',
  personal: '개인차량',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PodDetailPage({ params }: { params: { podId: string } }) {
  const { podId } = params;
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [pod, setPod] = useState<PodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchPodById(podId)
      .then(setPod)
      .catch(() => setError('팟 정보를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [podId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !pod) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">{error ?? '팟을 찾을 수 없어요.'}</p>
        <button onClick={() => router.back()} className="text-brand-600 text-sm font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  const isCreator = pod.creator.userId === currentUser?.userId;
  const isParticipant = pod.participants.some((p) => p.userId === currentUser?.userId);
  const isFull = pod.currentParticipants >= pod.maxParticipants;
  // 방장은 이미 참여자이므로 "팟 참여하기" 버튼에서 제외
  const canJoin = !isCreator && !isParticipant && !isFull && pod.status === 'recruiting';
  const status = STATUS_MAP[pod.status];

  const handleJoin = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await joinPod(podId);
      if (result.chatRoomId) {
        router.push(`/chat/${result.chatRoomId}`);
      } else {
        const updated = await fetchPodById(podId);
        setPod(updated);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setActionError(msg ?? '참여에 실패했어요.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('팟에서 나가시겠어요?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await leavePod(podId);
      router.push('/home');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setActionError(msg ?? '나가기에 실패했어요.');
      setActionLoading(false);
    }
  };

  const costPerPerson = pod.costPerPerson
    ? `${pod.costPerPerson.toLocaleString()}원`
    : pod.estimatedCost
    ? `약 ${Math.ceil(pod.estimatedCost / pod.maxParticipants).toLocaleString()}원`
    : '미정';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">팟 상세</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 space-y-4 pb-32">
        {/* 경로 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">경로</h2>
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-3 h-3 rounded-full bg-brand-600 ring-2 ring-brand-100" />
              <div className="w-0.5 h-10 bg-gray-200 my-1" />
              <Navigation size={14} className="text-gray-400 rotate-180" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">출발지</p>
                <p className="font-medium text-gray-900">{pod.departurePlace.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">도착지</p>
                <p className="font-medium text-gray-900">{pod.arrivalPlace.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 팟 정보 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">정보</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">출발 시간</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(pod.departureTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">인원</p>
                <p className="font-medium text-gray-900 text-sm">
                  {pod.currentParticipants} / {pod.maxParticipants}명
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">이동 수단</p>
                <p className="font-medium text-gray-900 text-sm">{VEHICLE_MAP[pod.vehicleType]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">1인 예상 비용</p>
                <p className="font-medium text-gray-900 text-sm">{costPerPerson}</p>
              </div>
            </div>
          </div>

          {pod.memo && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">메모</p>
              <p className="text-sm text-gray-700">{pod.memo}</p>
            </div>
          )}
        </div>

        {/* 참여자 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            참여자 ({pod.currentParticipants}/{pod.maxParticipants})
          </h2>
          <div className="space-y-3">
            {/* 방장 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-semibold text-sm">
                  {pod.creator.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 text-sm">{pod.creator.nickname}</span>
                  <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">방장</span>
                  {pod.creator.verificationBadge && (
                    <CheckCircle size={14} className="text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  매너점수 {parseFloat(pod.creator.mannerScore).toFixed(1)}
                </p>
              </div>
            </div>

            {/* 일반 참여자 */}
            {pod.participants
              .filter((p) => p.userId !== pod.creator.userId)
              .map((participant) => (
                <div key={participant.userId} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-semibold text-sm">
                      {participant.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 text-sm">{participant.nickname}</span>
                      {participant.verificationBadge && (
                        <CheckCircle size={14} className="text-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-safe space-y-2">
        {(isParticipant || isCreator) && pod.chatRoomId && (
          <button
            onClick={() => router.push(`/chat/${pod.chatRoomId}`)}
            className="w-full h-12 bg-brand-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
          >
            <MessageCircle size={18} />
            채팅방 입장
          </button>
        )}

        {canJoin && (
          <button
            onClick={handleJoin}
            disabled={actionLoading}
            className="w-full h-12 bg-brand-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
            팟 참여하기
          </button>
        )}

        {isParticipant && !isCreator && (
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="w-full h-12 bg-white border border-red-200 text-red-500 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            팟 나가기
          </button>
        )}

        {!isParticipant && !canJoin && pod.status === 'recruiting' && (
          <div className="w-full h-12 bg-gray-100 text-gray-400 font-semibold rounded-xl flex items-center justify-center">
            인원이 가득 찼어요
          </div>
        )}
      </div>
    </div>
  );
}
