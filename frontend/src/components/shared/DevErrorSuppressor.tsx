'use client';

import { useEffect } from 'react';

/**
 * Next.js 14.2.x webpack HMR 클라이언트 내부 버그인
 * `mgt.clearMarks is not a function` 에러를 개발 환경에서 억제합니다.
 * 이 에러는 사용자 코드와 무관한 Next.js 내부 성능 측정 코드의 버그입니다.
 */
export default function DevErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handler = (event: ErrorEvent) => {
      if (event.message?.includes('clearMarks')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // capturing phase에서 차단해야 Next.js Error Overlay보다 먼저 처리됨
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
  }, []);

  return null;
}
