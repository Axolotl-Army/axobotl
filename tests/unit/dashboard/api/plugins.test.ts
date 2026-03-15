import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockGuildFindByPk = vi.fn();
const mockPluginFindAll = vi.fn();
const mockPluginFindOrCreate = vi.fn();
const mockPluginSave = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getGuild: () => Promise.resolve({ findByPk: (...a: unknown[]) => mockGuildFindByPk(...a) }),
  getGuildPlugin: () =>
    Promise.resolve({
      findAll: (...a: unknown[]) => mockPluginFindAll(...a),
      findOrCreate: (...a: unknown[]) => mockPluginFindOrCreate(...a),
    }),
}));

// next/server is only available inside the Next.js runtime — provide a
// minimal stand-in that covers the subset used by the routes.
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

import { GET } from '../../../../src/dashboard/app/api/v1/guilds/[id]/plugins/route';
import { PATCH } from '../../../../src/dashboard/app/api/v1/guilds/[id]/plugins/[pluginId]/route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchParams(id: string, pluginId: string) {
  return { params: Promise.resolve({ id, pluginId }) };
}

function makeGetRequest(guildId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/guilds/${guildId}/plugins`);
}

function makePatchRequest(guildId: string, pluginId: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/guilds/${guildId}/plugins/${pluginId}`,
    { body: JSON.stringify(body) },
  );
}

/** Creates a mock GuildPlugin row whose save() delegates to mockPluginSave. */
function makePluginRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
    pluginId: 'leveling',
    enabled: false,
    config: {},
    save: (...a: unknown[]) => mockPluginSave(...a),
    ...overrides,
  };
  return row;
}

// ---------------------------------------------------------------------------
// GET /api/v1/guilds/[id]/plugins
// ---------------------------------------------------------------------------

describe('GET /api/v1/guilds/[id]/plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the session is not authenticated', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));

    expect(result.status).toBe(401);
  });

  it('returns 404 when the guild does not exist', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue(null);

    const result = await GET(makeGetRequest('000000000000000001'), makeListParams('000000000000000001'));
    const body = await result.json();

    expect(result.status).toBe(404);
    expect(body.error).toBe('Guild not found');
  });

  it('returns all plugin definitions with enabled=false when no rows are in the database', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    mockPluginFindAll.mockResolvedValue([]);

    const result = await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));
    const body = await result.json() as Array<{ id: string; enabled: boolean }>;

    expect(result.status).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.enabled === false)).toBe(true);
  });

  it('returns enabled=true for a plugin that has a row with enabled=true', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    mockPluginFindAll.mockResolvedValue([
      { pluginId: 'leveling', enabled: true, config: {} },
    ]);

    const result = await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));
    const body = await result.json() as Array<{ id: string; enabled: boolean }>;

    const leveling = body.find((p) => p.id === 'leveling');
    expect(leveling).toBeDefined();
    expect(leveling!.enabled).toBe(true);
  });

  it('merges stored config over the defaults so stored values win', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    mockPluginFindAll.mockResolvedValue([
      { pluginId: 'leveling', enabled: true, config: { xpMin: 3, xpMax: 20 } },
    ]);

    const result = await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));
    const body = await result.json() as Array<{ id: string; config: Record<string, unknown> }>;

    const leveling = body.find((p) => p.id === 'leveling');
    expect(leveling!.config['xpMin']).toBe(3);
    expect(leveling!.config['xpMax']).toBe(20);
  });

  it('includes default config keys that are absent from the stored row', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    // Only xpMin is stored — the rest should fall back to defaults
    mockPluginFindAll.mockResolvedValue([
      { pluginId: 'leveling', enabled: true, config: { xpMin: 5 } },
    ]);

    const result = await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));
    const body = await result.json() as Array<{ id: string; config: Record<string, unknown> }>;

    const leveling = body.find((p) => p.id === 'leveling');
    // cooldownMs is in the default config and was not overridden
    expect(leveling!.config).toHaveProperty('cooldownMs');
    expect(leveling!.config).toHaveProperty('xpMultiplier');
  });

  it('queries plugins only for the requested guild ID', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    mockPluginFindAll.mockResolvedValue([]);

    await GET(makeGetRequest('123456789012345678'), makeListParams('123456789012345678'));

    expect(mockPluginFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { guildId: '123456789012345678' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/guilds/[id]/plugins/[pluginId]
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/guilds/[id]/plugins/[pluginId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the session is not authenticated', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { enabled: true }),
      makePatchParams('123456789012345678', 'leveling'),
    );

    expect(result.status).toBe(401);
  });

  it('returns 400 for an unrecognised plugin ID', async () => {
    mockRequireOwner.mockResolvedValue(null);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'imaginary-plugin', { enabled: true }),
      makePatchParams('123456789012345678', 'imaginary-plugin'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid plugin ID');
  });

  it('returns 404 when the guild does not exist', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue(null);

    const result = await PATCH(
      makePatchRequest('000000000000000001', 'leveling', { enabled: true }),
      makePatchParams('000000000000000001', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(404);
    expect(body.error).toBe('Guild not found');
  });

  it('returns 400 when enabled is not a boolean', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow();
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { enabled: 'yes' }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('enabled must be a boolean');
    expect(mockPluginSave).not.toHaveBeenCalled();
  });

  it('enables a plugin and persists the change', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ enabled: false, config: {} });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);
    mockPluginSave.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { enabled: true }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.enabled).toBe(true);
    expect(mockPluginSave).toHaveBeenCalledOnce();
  });

  it('returns 400 for an unknown config key', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow();
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { hackerField: 99 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Unknown config key: hackerField');
    expect(mockPluginSave).not.toHaveBeenCalled();
  });

  it('returns 400 when xpMin is below the minimum of 1', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { xpMin: 0 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid value for config.xpMin');
  });

  it('returns 400 when xpMax exceeds the maximum of 100', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { xpMax: 101 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid value for config.xpMax');
  });

  it('returns 400 when xpMin would exceed xpMax after the update', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    // Current config has xpMax=10; the request sets xpMin=15 (> xpMax)
    const row = makePluginRow({ config: { xpMin: 5, xpMax: 10 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { xpMin: 15 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('xpMin must be <= xpMax');
    expect(mockPluginSave).not.toHaveBeenCalled();
  });

  it('returns 400 when xpMultiplier is outside the 0.1-10 range', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { xpMultiplier: 11 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid value for config.xpMultiplier');
  });

  it('returns 400 when cooldownMs is negative', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { cooldownMs: -1 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid value for config.cooldownMs');
  });

  it('returns 400 when levelUpMessage exceeds 500 characters', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);

    const tooLong = 'a'.repeat(501);
    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { levelUpMessage: tooLong } }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(400);
    expect(body.error).toBe('Invalid value for config.levelUpMessage');
  });

  it('accepts levelUpMessage=null to clear the message', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({
      enabled: true,
      config: { xpMin: 7, xpMax: 13, levelUpMessage: 'You leveled up!' },
    });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);
    mockPluginSave.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { levelUpMessage: null } }),
      makePatchParams('123456789012345678', 'leveling'),
    );

    expect(result.status).toBe(200);
    expect(mockPluginSave).toHaveBeenCalledOnce();
  });

  it('accepts valid xpMin=xpMax boundary (equal values are allowed)', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);
    mockPluginSave.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { xpMin: 10, xpMax: 10 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );

    expect(result.status).toBe(200);
    expect(mockPluginSave).toHaveBeenCalledOnce();
  });

  it('accepts the maximum valid cooldownMs of 300000', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({ config: { xpMin: 7, xpMax: 13 } });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);
    mockPluginSave.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { config: { cooldownMs: 300000 } }),
      makePatchParams('123456789012345678', 'leveling'),
    );

    expect(result.status).toBe(200);
  });

  it('returns the saved plugin state in the response body', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildFindByPk.mockResolvedValue({ id: '123456789012345678', name: 'Test Guild' });
    const row = makePluginRow({
      pluginId: 'leveling',
      enabled: true,
      config: { xpMin: 7, xpMax: 13 },
    });
    mockPluginFindOrCreate.mockResolvedValue([row, false]);
    mockPluginSave.mockResolvedValue(undefined);

    const result = await PATCH(
      makePatchRequest('123456789012345678', 'leveling', { enabled: true }),
      makePatchParams('123456789012345678', 'leveling'),
    );
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.id).toBe('leveling');
    expect(body).toHaveProperty('enabled');
    expect(body).toHaveProperty('config');
  });
});
