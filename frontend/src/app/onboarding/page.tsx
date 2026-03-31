import { redirect } from 'next/navigation';

// 랜딩 페이지가 /로 이동했으므로 리다이렉트
export default function OnboardingPage() {
  redirect('/');
}
