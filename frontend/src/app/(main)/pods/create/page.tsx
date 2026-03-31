'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, MapPin, Clock, Users, Car, Loader2, Minus, Plus, AlertCircle } from 'lucide-react';
import { createPod } from '@/lib/api/pods';
import type { VehicleType } from '@/types/pod';

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMinDatetime() {
  return toLocalIso(new Date(Date.now() + 5 * 60 * 1000));
}

function getDefaultDatetime() {
  return toLocalIso(new Date(Date.now() + 60 * 60 * 1000));
}

function formatKoreanDatetime(localIso: string) {
  if (!localIso) return '';
  const d = new Date(localIso);
  if (isNaN(d.getTime())) return localIso;
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const schema = z.object({
  departureName: z.string().min(1, '출발지를 입력해주세요'),
  departureLat: z.coerce.number().min(-90).max(90, '올바른 위도를 입력해주세요'),
  departureLng: z.coerce.number().min(-180).max(180, '올바른 경도를 입력해주세요'),
  arrivalName: z.string().min(1, '도착지를 입력해주세요'),
  arrivalLat: z.coerce.number().min(-90).max(90, '올바른 위도를 입력해주세요'),
  arrivalLng: z.coerce.number().min(-180).max(180, '올바른 경도를 입력해주세요'),
  departureTime: z.string().min(1, '출발 시간을 선택해주세요'),
  vehicleType: z.enum(['taxi', 'personal']),
  estimatedCost: z.coerce.number().min(0).optional(),
  memo: z.string().max(100, '메모는 100자 이내로 입력해주세요').optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreatePodPage() {
  const router = useRouter();
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCoord, setShowCoord] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleType: 'taxi',
      departureTime: getDefaultDatetime(),
      departureLat: 37.5502,
      departureLng: 126.981,
      arrivalLat: 37.4979,
      arrivalLng: 127.0276,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const pod = await createPod({
        departurePlace: {
          name: values.departureName,
          latitude: values.departureLat,
          longitude: values.departureLng,
        },
        arrivalPlace: {
          name: values.arrivalName,
          latitude: values.arrivalLat,
          longitude: values.arrivalLng,
        },
        departureTime: new Date(values.departureTime).toISOString(),
        maxParticipants,
        vehicleType: values.vehicleType as VehicleType,
        estimatedCost: values.estimatedCost || undefined,
        memo: values.memo || undefined,
      });
      router.push(`/pods/${pod.podId}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setSubmitError(msg ?? '팟 생성에 실패했어요. 다시 시도해주세요.');
    }
  };

  const departureTimeValue = watch('departureTime');

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border text-sm outline-none transition-colors ${
      hasError
        ? 'border-red-400 bg-red-50 focus:border-red-500'
        : 'border-gray-200 bg-gray-50 focus:border-brand-500 focus:bg-white'
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 mt-3">팟 만들기</h1>
        <p className="text-sm text-gray-500 mt-1">카풀 팟을 개설해 멤버를 모집해요</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} method="post" className="flex-1 px-4 py-6 space-y-6 pb-36">

        {/* 출발지 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
              <MapPin size={12} className="text-white" />
            </div>
            <h2 className="font-semibold text-gray-800">출발지</h2>
          </div>
          <input
            {...register('departureName')}
            placeholder="출발지 이름 (예: 서울역)"
            className={inputCls(!!errors.departureName)}
          />
          {errors.departureName && (
            <p className="text-xs text-red-500">{errors.departureName.message}</p>
          )}
          <button
            type="button"
            onClick={() => setShowCoord((v) => !v)}
            className="text-xs text-brand-600 underline"
          >
            {showCoord ? '좌표 입력 숨기기' : '좌표 직접 입력 (선택)'}
          </button>
          {showCoord && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  {...register('departureLat')}
                  placeholder="위도 (예: 37.5502)"
                  type="number"
                  step="any"
                  className={inputCls(!!errors.departureLat)}
                />
                {errors.departureLat && (
                  <p className="text-xs text-red-500 mt-1">{errors.departureLat.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register('departureLng')}
                  placeholder="경도 (예: 126.9810)"
                  type="number"
                  step="any"
                  className={inputCls(!!errors.departureLng)}
                />
                {errors.departureLng && (
                  <p className="text-xs text-red-500 mt-1">{errors.departureLng.message}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 도착지 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
              <MapPin size={12} className="text-white" />
            </div>
            <h2 className="font-semibold text-gray-800">도착지</h2>
          </div>
          <input
            {...register('arrivalName')}
            placeholder="도착지 이름 (예: 강남역)"
            className={inputCls(!!errors.arrivalName)}
          />
          {errors.arrivalName && (
            <p className="text-xs text-red-500">{errors.arrivalName.message}</p>
          )}
          {showCoord && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  {...register('arrivalLat')}
                  placeholder="위도 (예: 37.4979)"
                  type="number"
                  step="any"
                  className={inputCls(!!errors.arrivalLat)}
                />
                {errors.arrivalLat && (
                  <p className="text-xs text-red-500 mt-1">{errors.arrivalLat.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register('arrivalLng')}
                  placeholder="경도 (예: 127.0276)"
                  type="number"
                  step="any"
                  className={inputCls(!!errors.arrivalLng)}
                />
                {errors.arrivalLng && (
                  <p className="text-xs text-red-500 mt-1">{errors.arrivalLng.message}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 출발 시간 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">출발 시간</h2>
          </div>
          {/* 한국어 미리보기 — 클라이언트에서만 렌더링 (하이드레이션 불일치 방지) */}
          {mounted && departureTimeValue && (
            <p className="text-sm font-medium text-brand-700 bg-brand-50 rounded-xl px-4 py-2">
              {formatKoreanDatetime(departureTimeValue)}
            </p>
          )}
          <input
            {...register('departureTime')}
            type="datetime-local"
            min={getMinDatetime()}
            className={inputCls(!!errors.departureTime)}
          />
          {errors.departureTime && (
            <p className="text-xs text-red-500">{errors.departureTime.message}</p>
          )}
        </section>

        {/* 최대 인원 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">최대 인원</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMaxParticipants((n) => Math.max(2, n - 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-40"
              disabled={maxParticipants <= 2}
            >
              <Minus size={16} />
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{maxParticipants}</span>
            <button
              type="button"
              onClick={() => setMaxParticipants((n) => Math.min(4, n + 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-40"
              disabled={maxParticipants >= 4}
            >
              <Plus size={16} />
            </button>
            <span className="text-sm text-gray-400 ml-2">명 (최대 4명)</span>
          </div>
        </section>

        {/* 이동 수단 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Car size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">이동 수단</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['taxi', 'personal'] as const).map((type) => (
              <label key={type} className="cursor-pointer">
                <input {...register('vehicleType')} type="radio" value={type} className="sr-only peer" />
                <div className="h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 transition-all">
                  {type === 'taxi' ? '🚕 택시' : '🚗 개인차량'}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* 예상 비용 */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800">
            예상 총 비용 <span className="text-gray-400 font-normal text-sm">(선택)</span>
          </h2>
          <div className="relative">
            <input
              {...register('estimatedCost')}
              type="number"
              placeholder="예: 12000"
              min={0}
              className={`${inputCls(!!errors.estimatedCost)} pr-8`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
          </div>
        </section>

        {/* 메모 */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800">
            메모 <span className="text-gray-400 font-normal text-sm">(선택)</span>
          </h2>
          <textarea
            {...register('memo')}
            placeholder="픽업 위치, 특이 사항 등을 입력해요"
            rows={3}
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none transition-colors ${
              errors.memo
                ? 'border-red-400 bg-red-50 focus:border-red-500'
                : 'border-gray-200 bg-gray-50 focus:border-brand-500 focus:bg-white'
            }`}
          />
          {errors.memo && <p className="text-xs text-red-500">{errors.memo.message}</p>}
        </section>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
      </form>

      {/* 하단 버튼: 하단 탭(64px) 위에 위치, 최대 너비 제한 */}
      <div className="fixed bottom-16 left-0 right-0 mx-auto w-full max-w-mobile px-4 pb-3 bg-white border-t border-gray-100 pt-3 z-40">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full h-14 bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors disabled:opacity-60 text-base"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : '팟 만들기'}
        </button>
      </div>
    </div>
  );
}
