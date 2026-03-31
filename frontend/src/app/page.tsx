import Link from 'next/link';
import { MapPin, Shield, Users, Car, ArrowRight } from 'lucide-react';

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
      <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 히어로 */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-12">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-6">
          <Car className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">알고타</h1>
        <p className="text-lg text-brand-600 font-medium mt-1">같은 길, 같이 가자</p>
        <p className="text-gray-500 text-center mt-4 text-sm leading-relaxed">
          출발지와 도착지가 비슷한 사람들과
          <br />
          실시간으로 카풀을 매칭해 드립니다
        </p>
      </section>

      {/* 특징 */}
      <section className="px-6 py-8 space-y-4">
        <FeatureCard
          icon={<MapPin size={20} />}
          title="실시간 위치 매칭"
          desc="내 주변 카풀을 지도에서 바로 확인하세요"
        />
        <FeatureCard
          icon={<Shield size={20} />}
          title="안전한 카풀"
          desc="이메일 인증과 매너 평가로 신뢰를 쌓아요"
        />
        <FeatureCard
          icon={<Users size={20} />}
          title="함께하는 이동"
          desc="같은 방향 팟에 참여하고 실시간으로 소통해요"
        />
      </section>

      {/* 숫자 */}
      <section className="px-6 py-6">
        <div className="bg-brand-50 rounded-2xl p-6 flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-brand-600">24시간</p>
            <p className="text-xs text-gray-500 mt-1">실시간 매칭</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600">4명</p>
            <p className="text-xs text-gray-500 mt-1">최대 인원</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600">1/N</p>
            <p className="text-xs text-gray-500 mt-1">비용 분담</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-auto px-6 pb-10 space-y-3">
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-semibold transition-colors"
        >
          시작하기
          <ArrowRight size={18} />
        </Link>
        <Link
          href="/login"
          className="block w-full text-center border border-gray-200 hover:border-gray-300 text-gray-700 py-3.5 rounded-xl font-medium transition-colors"
        >
          이미 계정이 있으신가요? 로그인
        </Link>
      </section>
    </div>
  );
}
