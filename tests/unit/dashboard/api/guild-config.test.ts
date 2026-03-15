import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFindByPk = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getGuild: () =>
    Promise.resolve({
      findByPk: (...a: unknown[]) => mockFindByPk(...a),
    }),
}));

// next/server is only available in the Next.js runtime — mock it for the test environment.
// MockNextRequest mimics the subset the route uses: request.json()
// MockNextResponse mimics the subset the route uses: NextResponse.json(data, { status })
vi.mock('next/server', () => {
  class MockNextResponse {
    readonly status: number;
    private readonly _body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status ?? 200;
    }

    async json() {
      return this._body;
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
  }

  class MockNextRequest {
    private readonly _body: unknown;
    constructor(_url: string, init?: { body?: string }) {
      this._body = init?.body !== undefined ? JSON.parse(init.body) : undefined;
    }
    async json() {
      return this._body;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
});

import { GET, PATCH } from '../../../../src/dashboard/app/api/v1/guilds/[id]/route';
import { NextRequest } from 'next/server';

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/guilds/123456789');
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/guilds/123456789', {
    body: JSON.stringify(body),
  });
}

function makeMockGuild(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '123456789',
    name: 'Test Guild',
    language: 'en',
    levelUpMessage: null,
    levelUpChannelId: null,
    update: (...a: unknown[]) => mockUpdate(...a),
    ...overrides,
  };
}

describe('GET /api/v1/guilds/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET(makeGetRequest(), makeParams('123456789'));

    expect(result.status).toBe(401);
  });

  it('returns 404 when guild not found', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindByPk.mockResolvedValue(null);

    const result = await GET(makeGetRequest(), makeParams('999999999'));
    const body = await result.json();

    expect(result.status).toBe(404);
    expect(body.error).toBe('Guild not found');
  });

  it('returns guild data when found', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild();
    mockFindByPk.mockResolvedValue(guild);

    const result = await GET(makeGetRequest(), makeParams('123456789'));
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(mockFindByPk).toHaveBeenCalledWith('123456789');
    expect(body.id).toBe('123456789');
    expect(body.name).toBe('Test Guild');
  });
});

describe('PATCH /api/v1/guilds/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await PATCH(makePatchRequest({ language: 'fr' }), makeParams('123456789'));

    expect(result.status).toBe(401);
  });

  it('returns 404 when guild not found', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindByPk.mockResolvedValue(null);

    const result = await PATCH(makePatchRequest({ language: 'fr' }), makeParams('999999999'));
    const body = await result.json();

    expect(result.status).toBe(404);
    expect(body.error).toBe('Guild not found');
  });

  it('returns 400 when no valid fields are provided', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindByPk.mockResolvedValue(makeMockGuild());

    const result = await PATCH(makePatchRequest({ unknownField: 'value' }), makeParams('123456789'));
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('No valid fields to update');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when language exceeds 10 characters', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindByPk.mockResolvedValue(makeMockGuild());

    const result = await PATCH(
      makePatchRequest({ language: 'toolonglanguagecode' }),
      makeParams('123456789'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('language must be at most 10 characters');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when levelUpMessage exceeds 500 characters', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindByPk.mockResolvedValue(makeMockGuild());

    const tooLong = 'a'.repeat(501);
    const result = await PATCH(
      makePatchRequest({ levelUpMessage: tooLong }),
      makeParams('123456789'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('levelUpMessage must be at most 500 characters');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('successfully updates language', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild();
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const result = await PATCH(makePatchRequest({ language: 'fr' }), makeParams('123456789'));

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ language: 'fr' });
  });

  it('successfully updates levelUpChannelId to a value', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild();
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest({ levelUpChannelId: '987654321098765432' }),
      makeParams('123456789'),
    );

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ levelUpChannelId: '987654321098765432' });
  });

  it('successfully sets levelUpChannelId to null (reset)', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild({ levelUpChannelId: '987654321098765432' });
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest({ levelUpChannelId: null }),
      makeParams('123456789'),
    );

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ levelUpChannelId: null });
  });

  it('successfully updates levelUpMessage', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild();
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const message = 'Congratulations {user}, you reached level {level}!';
    const result = await PATCH(
      makePatchRequest({ levelUpMessage: message }),
      makeParams('123456789'),
    );

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ levelUpMessage: message });
  });

  it('trims whitespace from string values', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild();
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest({ language: '  en  ' }),
      makeParams('123456789'),
    );

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ language: 'en' });
  });

  it('treats whitespace-only string as null', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guild = makeMockGuild({ levelUpMessage: 'You leveled up!' });
    mockFindByPk.mockResolvedValue(guild);
    mockUpdate.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest({ levelUpMessage: '   ' }),
      makeParams('123456789'),
    );

    expect(result.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ levelUpMessage: null });
  });
});
