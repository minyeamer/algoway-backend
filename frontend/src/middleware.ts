import { NextRequest, NextResponse } from 'next/server';

// 인증이 필요 없는 공개 경로
const PUBLIC_PATHS = ['/onboarding', '/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 루트(/) 및 PUBLIC_PATHS는 인증 불필요
  const isPublic = pathname === '/' || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  // Refresh Token은 httpOnly 쿠키로 저장 (백엔드에서 Set-Cookie 처리)
  const hasRefreshToken = request.cookies.has('refresh_token');

  // 비인증 사용자가 보호 경로에 접근 → 로그인으로
  if (!isPublic && !hasRefreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 인증된 사용자가 공개 경로에 접근 → 홈으로
  if (isPublic && hasRefreshToken) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
};
