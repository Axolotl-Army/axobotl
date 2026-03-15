import { NextRequest, NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originMatchesHost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const host = request.headers.get('host');
  if (!host) return false;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  // NextAuth handles its own CSRF protection
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  if (!originMatchesHost(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
