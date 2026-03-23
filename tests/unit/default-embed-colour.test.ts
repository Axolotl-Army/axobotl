import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- API Route Tests ---

const mockRequireOwner = vi.fn();
const mockGuildFindByPk = vi.fn();
const mockGuildUpdate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getGuild: () =>
    Promise.resolve({ findByPk: (...a: unknown[]) => mockGuildFindByPk(...a) }),
}));

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

const { NextRequest } = await import('next/server');
const { PATCH } = await import(
  '@/app/api/v1/guilds/[id]/route'
);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost', {
    body: JSON.stringify(body),
  }) as never;
}

function makeParams(id = '123456789') {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/v1/guilds/:id — embedColor field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue(null);
    mockGuildUpdate.mockImplementation(function (
      this: Record<string, unknown>,
      updates: Record<string, unknown>,
    ) {
      Object.assign(this, updates);
      return Promise.resolve(this);
    });
  });

  function mockGuild(overrides: Record<string, unknown> = {}) {
    const guild = {
      id: '123456789',
      language: 'en',
      embedColor: null,
      disabledCommands: [],
      update: mockGuildUpdate,
      toJSON() {
        return this;
      },
      ...overrides,
    };
    // bind update to this guild instance
    guild.update = mockGuildUpdate.bind(guild);
    mockGuildFindByPk.mockResolvedValue(guild);
    return guild;
  }

  it('should accept a valid hex colour and persist it', async () => {
    mockGuild();
    const res = await PATCH(makeRequest({ embedColor: '#FF5733' }), makeParams());
    expect(res.status).toBe(200);
    expect(mockGuildUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ embedColor: '#FF5733' }),
    );
  });

  it('should accept null to reset embedColor to default', async () => {
    mockGuild({ embedColor: '#FF5733' });
    const res = await PATCH(makeRequest({ embedColor: null }), makeParams());
    expect(res.status).toBe(200);
    expect(mockGuildUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ embedColor: null }),
    );
  });

  it('should convert empty string to null', async () => {
    mockGuild({ embedColor: '#FF5733' });
    const res = await PATCH(makeRequest({ embedColor: '' }), makeParams());
    expect(res.status).toBe(200);
    expect(mockGuildUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ embedColor: null }),
    );
  });

  it('should reject an invalid hex string (missing #)', async () => {
    mockGuild();
    const res = await PATCH(makeRequest({ embedColor: 'FF5733' }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hex colour/i);
  });

  it('should reject a hex string that is too short', async () => {
    mockGuild();
    const res = await PATCH(makeRequest({ embedColor: '#FFF' }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hex colour/i);
  });

  it('should reject a non-string, non-null value', async () => {
    mockGuild();
    const res = await PATCH(makeRequest({ embedColor: 12345 }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hex colour/i);
  });

  it('should accept case-insensitive hex values and preserve them', async () => {
    mockGuild();
    const res = await PATCH(makeRequest({ embedColor: '#ff5733' }), makeParams());
    expect(res.status).toBe(200);
    expect(mockGuildUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ embedColor: '#ff5733' }),
    );
  });
});

// --- Bot Helper Tests ---

const mockBotGuildFindByPk = vi.fn();

vi.mock('../../src/shared/models/Guild', () => ({
  Guild: { findByPk: (...a: unknown[]) => mockBotGuildFindByPk(...a) },
}));

const { getEmbedColor, DEFAULT_EMBED_COLOR } = await import(
  '../../src/bot/utils/embedUtils'
);

describe('getEmbedColor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return guild embedColor as a number when set', async () => {
    mockBotGuildFindByPk.mockResolvedValue({ embedColor: '#FF5733' });
    const colour = await getEmbedColor('123');
    expect(colour).toBe(0xff5733);
    expect(typeof colour).toBe('number');
  });

  it('should return default colour (Blurple) when guild embedColor is null', async () => {
    mockBotGuildFindByPk.mockResolvedValue({ embedColor: null });
    const colour = await getEmbedColor('123');
    expect(colour).toBe(DEFAULT_EMBED_COLOR);
    expect(colour).toBe(0x5865f2);
  });

  it('should return default colour when guild is not found', async () => {
    mockBotGuildFindByPk.mockResolvedValue(null);
    const colour = await getEmbedColor('nonexistent');
    expect(colour).toBe(DEFAULT_EMBED_COLOR);
  });
});
