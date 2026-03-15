import { describe, it, expect, vi } from 'vitest';

// Test the CSRF middleware logic in isolation by importing it directly.
// The security headers are declarative in next.config.ts and verified via E2E.

// We need to mock next/server since it's a Next.js runtime module
vi.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: string | null;
    constructor(body?: string | null, init?: { status?: number }) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
    }
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }

  return { NextRequest: vi.fn(), NextResponse: MockNextResponse };
});

function createMockRequest(method: string, url: string, headers: Record<string, string> = {}) {
  const parsedUrl = new URL(url);
  return {
    method,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    nextUrl: {
      pathname: parsedUrl.pathname,
    },
  };
}

// Import middleware after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
async function loadMiddleware() {
  const mod = await import('../../src/dashboard/middleware');
  return mod.middleware;
}

describe('CSRF Middleware', () => {
  describe('safe methods (GET, HEAD, OPTIONS)', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s requests without Origin header', async (method) => {
      const middleware = await loadMiddleware();
      const req = createMockRequest(method, 'http://localhost:3000/api/v1/stats');
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    });
  });

  describe('mutating methods (POST, PUT, PATCH, DELETE)', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects %s without Origin header', async (method) => {
      const middleware = await loadMiddleware();
      const req = createMockRequest(method, 'http://localhost:3000/api/v1/guilds');
      const res = middleware(req as never);
      expect(res.status).toBe(403);
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects %s with mismatched Origin', async (method) => {
      const middleware = await loadMiddleware();
      const req = createMockRequest(method, 'http://localhost:3000/api/v1/guilds', {
        origin: 'http://evil.com',
        host: 'localhost:3000',
      });
      const res = middleware(req as never);
      expect(res.status).toBe(403);
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('allows %s with matching Origin', async (method) => {
      const middleware = await loadMiddleware();
      const req = createMockRequest(method, 'http://localhost:3000/api/v1/guilds', {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      });
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    });
  });

  describe('NextAuth bypass', () => {
    it('allows POST to /api/auth/ without Origin', async () => {
      const middleware = await loadMiddleware();
      const req = createMockRequest('POST', 'http://localhost:3000/api/auth/callback/discord');
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    });

    it('allows POST to /api/auth/signout without Origin', async () => {
      const middleware = await loadMiddleware();
      const req = createMockRequest('POST', 'http://localhost:3000/api/auth/signout');
      const res = middleware(req as never);
      expect(res.status).toBe(200);
    });
  });

  describe('edge cases', () => {
    it('rejects POST with invalid Origin URL', async () => {
      const middleware = await loadMiddleware();
      const req = createMockRequest('POST', 'http://localhost:3000/api/v1/guilds', {
        origin: 'not-a-url',
        host: 'localhost:3000',
      });
      const res = middleware(req as never);
      expect(res.status).toBe(403);
    });

    it('rejects POST with Origin but no Host header', async () => {
      const middleware = await loadMiddleware();
      const req = createMockRequest('POST', 'http://localhost:3000/api/v1/guilds', {
        origin: 'http://localhost:3000',
      });
      const res = middleware(req as never);
      expect(res.status).toBe(403);
    });
  });
});

describe('Security Headers (next.config.ts)', () => {
  it('config includes security headers for all routes', async () => {
    // Import the config and verify headers are declared
    const configMod = await import('../../src/dashboard/next.config');
    const config = configMod.default;

    expect(config.headers).toBeDefined();
    const headers = await config.headers!();
    expect(headers).toHaveLength(1);
    expect(headers[0].source).toBe('/(.*)');

    const headerMap = Object.fromEntries(
      headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    );

    expect(headerMap['X-Frame-Options']).toBe('DENY');
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['X-DNS-Prefetch-Control']).toBe('off');
    expect(headerMap['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });
});
