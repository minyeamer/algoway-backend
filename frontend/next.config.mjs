/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  // 카카오 지도 스크립트 허용 (CSP는 프로덕션에서만 적용 — 개발 모드에서는 webpack eval 때문에 비활성화)
  async headers() {
    if (isDev) return [];
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' *.kakao.com *.daumcdn.net",
              "style-src 'self' 'unsafe-inline' *.kakao.com *.jsdelivr.net cdn.jsdelivr.net",
              "font-src 'self' *.jsdelivr.net cdn.jsdelivr.net",
              "img-src 'self' data: blob: *.kakao.com *.daumcdn.net",
              "connect-src 'self' wss: *.kakao.com",
              "frame-src 'self' *.kakao.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
