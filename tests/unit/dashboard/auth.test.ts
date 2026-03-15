import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next-auth/providers/discord', () => ({ default: vi.fn(() => ({})) }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn() },
}));

describe('Auth callbacks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['BOT_OWNER_ID'] = 'owner123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('signIn', () => {
    async function getSignIn() {
      vi.resetModules();
      const { authOptions } = await import('../../../src/dashboard/lib/auth');
      return authOptions.callbacks!.signIn!;
    }

    it('allows sign-in when profile.id matches BOT_OWNER_ID', async () => {
      const signIn = await getSignIn();
      const result = await signIn({
        profile: { id: 'owner123' },
        user: {},
        account: null,
      } as never);
      expect(result).toBe(true);
    });

    it('denies sign-in when profile.id does not match', async () => {
      const signIn = await getSignIn();
      const result = await signIn({
        profile: { id: 'other456' },
        user: {},
        account: null,
      } as never);
      expect(result).toBe(false);
    });

    it('denies sign-in when BOT_OWNER_ID is not set', async () => {
      delete process.env['BOT_OWNER_ID'];
      const signIn = await getSignIn();
      const result = await signIn({
        profile: { id: 'owner123' },
        user: {},
        account: null,
      } as never);
      expect(result).toBe(false);
    });
  });

  describe('jwt', () => {
    async function getJwt() {
      vi.resetModules();
      const { authOptions } = await import('../../../src/dashboard/lib/auth');
      return authOptions.callbacks!.jwt!;
    }

    it('adds discordId and accessToken on initial sign-in', async () => {
      const jwt = await getJwt();
      const token = await jwt({
        token: { sub: '1' },
        account: { access_token: 'tok_abc' },
        profile: { id: 'owner123' },
      } as never);
      expect(token).toMatchObject({ discordId: 'owner123', accessToken: 'tok_abc' });
    });

    it('passes through token on subsequent calls', async () => {
      const jwt = await getJwt();
      const token = await jwt({
        token: { sub: '1', discordId: 'owner123' },
      } as never);
      expect(token).toMatchObject({ sub: '1', discordId: 'owner123' });
    });
  });

  describe('session', () => {
    async function getSession() {
      vi.resetModules();
      const { authOptions } = await import('../../../src/dashboard/lib/auth');
      return authOptions.callbacks!.session!;
    }

    it('adds discordId to session.user', async () => {
      const sessionCb = await getSession();
      const session = await sessionCb({
        session: { user: { name: 'Test' }, expires: '' },
        token: { discordId: 'owner123' },
      } as never);
      expect((session.user as Record<string, unknown>).discordId).toBe('owner123');
    });
  });
});
