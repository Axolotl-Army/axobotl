import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: string | null;
    headers: Map<string, string>;
    constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }

  return { NextRequest: vi.fn(), NextResponse: MockNextResponse };
});

function createMockRequest(method: string, url: string) {
  const parsedUrl = new URL(url);
  return {
    method,
    ip: '127.0.0.1',
    headers: {
      get: () => null,
    },
    nextUrl: {
      pathname: parsedUrl.pathname,
    },
  };
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadMiddleware() {
    const mod = await import('../../src/dashboard/middleware');
    return mod.middleware;
  }

  it('allows requests within auth rate limit (10/min)', async () => {
    const middleware = await loadMiddleware();
    for (let i = 0; i < 10; i++) {
      const req = createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord');
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    }
  });

  it('blocks auth requests exceeding rate limit', async () => {
    const middleware = await loadMiddleware();
    for (let i = 0; i < 10; i++) {
      middleware(createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord') as never);
    }
    const res = middleware(
      createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord') as never,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('allows requests within API rate limit (60/min)', async () => {
    const middleware = await loadMiddleware();
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest('GET', 'http://localhost:3000/api/v1/stats');
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    }
  });

  it('blocks API requests exceeding rate limit', async () => {
    const middleware = await loadMiddleware();
    for (let i = 0; i < 60; i++) {
      middleware(createMockRequest('GET', 'http://localhost:3000/api/v1/stats') as never);
    }
    const res = middleware(
      createMockRequest('GET', 'http://localhost:3000/api/v1/stats') as never,
    );
    expect(res.status).toBe(429);
  });

  it('tracks auth and API limits independently', async () => {
    const middleware = await loadMiddleware();
    // Exhaust auth limit
    for (let i = 0; i < 11; i++) {
      middleware(
        createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord') as never,
      );
    }
    // Auth should be blocked
    const authRes = middleware(
      createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord') as never,
    );
    expect(authRes.status).toBe(429);
    // API should still work
    const apiRes = middleware(
      createMockRequest('GET', 'http://localhost:3000/api/v1/stats') as never,
    );
    expect(apiRes.status).toBe(200);
  });

  it('does not rate limit routes outside /api/auth and /api/v1', async () => {
    const middleware = await loadMiddleware();
    const req = createMockRequest('GET', 'http://localhost:3000/api/health');
    const res = middleware(req as never);
    expect(res.status).toBe(200);
  });
});
