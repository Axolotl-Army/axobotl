import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFindAll = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getGuild: () => Promise.resolve({ findAll: (...a: unknown[]) => mockFindAll(...a) }),
}));

import { GET } from '../../../../src/dashboard/app/api/v1/guilds/route';

describe('GET /api/v1/guilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when not authorized', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET();
    expect(result.status).toBe(401);
  });

  it('returns guilds ordered by name when authorized', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const guilds = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }];
    mockFindAll.mockResolvedValue(guilds);

    const result = await GET();
    const body = await result.json();

    expect(mockFindAll).toHaveBeenCalledWith({ order: [['name', 'ASC']] });
    expect(body).toEqual(guilds);
  });

  it('returns empty array when no guilds exist', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindAll.mockResolvedValue([]);

    const result = await GET();
    const body = await result.json();
    expect(body).toEqual([]);
  });
});
