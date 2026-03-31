import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',  // 알고타 브랜드 컬러 (추후 확정)
          foreground: '#FFFFFF',
        },
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      // 모바일 우선 — 최대 너비 고정 (앱과 유사한 UX)
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
