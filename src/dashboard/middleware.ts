import { NextRequest, NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Rate limit: [max requests per window, window in ms]
const AUTH_LIMIT = { max: 10, windowMs: 60_000 };
const API_LIMIT = { max: 60, windowMs: 60_000 };

// In-memory sliding window store (persists across requests in standalone mode)
const rateLimitStore = new Map<string, number[]>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(
  request: NextRequest,
  limit: { max: number; windowMs: number },
  prefix: string,
): NextResponse | null {
  const now = Date.now();

  // Periodic cleanup to prevent memory leaks
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    const maxWindow = Math.max(AUTH_LIMIT.windowMs, API_LIMIT.windowMs);
    for (const [key, timestamps] of rateLimitStore) {
      const filtered = timestamps.filter((t) => t > now - maxWindow);
      if (filtered.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, filtered);
      }
    }
  }

  const ip = getClientIp(request);
  const key = `${prefix}:${ip}`;
  const windowStart = now - limit.windowMs;

  const timestamps = rateLimitStore.get(key) ?? [];
  const recent = timestamps.filter((t) => t > windowStart);
  recent.push(now);
  rateLimitStore.set(key, recent);

  if (recent.length > limit.max) {
    const retryAfter = Math.max(
      1,
      Math.ceil((recent[0] + limit.windowMs - now) / 1000),
    );
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit.max),
        'X-RateLimit-Remaining': '0',
      },
    });
  }

  return null;
}

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
  const { pathname } = request.nextUrl;

  // Rate limiting (applied before CSRF to block brute-force early)
  if (pathname.startsWith('/api/auth/')) {
    const limited = checkRateLimit(request, AUTH_LIMIT, 'auth');
    if (limited) return limited;
  } else if (pathname.startsWith('/api/v1/')) {
    const limited = checkRateLimit(request, API_LIMIT, 'api');
    if (limited) return limited;
  }

  // CSRF: safe methods pass through
  if (SAFE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  // NextAuth handles its own CSRF protection
  if (pathname.startsWith('/api/auth/')) {
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
