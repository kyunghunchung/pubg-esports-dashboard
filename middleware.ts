import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // 개발 환경: 인증 없이 통과 (배포 전 아래 블록으로 교체)
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // 프로덕션: NextAuth 토큰 확인
  // withAuth로 교체 예정 (Phase 5 배포 단계)
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/events/:path*', '/compare/:path*', '/reports/:path*', '/admin/:path*'],
}
