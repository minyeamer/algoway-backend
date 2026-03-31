import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/shared/QueryProvider';
import DevErrorSuppressor from '@/components/shared/DevErrorSuppressor';

export const metadata: Metadata = {
  title: '알고타 — 같은 길, 같이 가자',
  description: '대학생·직장인을 위한 실시간 카풀 매칭 플랫폼',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <DevErrorSuppressor />
          <div className="mx-auto max-w-mobile min-h-screen bg-white shadow-sm">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
