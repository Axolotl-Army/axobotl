import { describe, it, expect, vi, afterAll } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next-auth/providers/discord', () => ({ default: vi.fn(() => ({})) }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn() },
}));

describe('NextAuth Secure Cookies', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterAll(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('uses non-secure cookies in non-production', async () => {
    vi.resetModules();
    process.env['NODE_ENV'] = 'development';
    const { authOptions } = await import('../../src/dashboard/lib/auth');

    expect(authOptions.cookies?.sessionToken?.options?.secure).toBe(false);
    expect(authOptions.cookies?.sessionToken?.name).toBe('next-auth.session-token');
    expect(authOptions.cookies?.sessionToken?.options?.httpOnly).toBe(true);
    expect(authOptions.cookies?.sessionToken?.options?.sameSite).toBe('lax');
  });

  it('uses secure cookies in production', async () => {
    vi.resetModules();
    process.env['NODE_ENV'] = 'production';
    const { authOptions } = await import('../../src/dashboard/lib/auth');

    expect(authOptions.cookies?.sessionToken?.options?.secure).toBe(true);
    expect(authOptions.cookies?.sessionToken?.name).toBe('__Secure-next-auth.session-token');
    expect(authOptions.cookies?.sessionToken?.options?.httpOnly).toBe(true);
    expect(authOptions.cookies?.sessionToken?.options?.sameSite).toBe('lax');
  });
});
