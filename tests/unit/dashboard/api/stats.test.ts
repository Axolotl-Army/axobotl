import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockGuildCount = vi.fn();
const mockCommandLogCount = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getGuild: () => Promise.resolve({ count: () => mockGuildCount() }),
  getCommandLog: () => Promise.resolve({ count: () => mockCommandLogCount() }),
}));

import { GET } from '../../../../src/dashboard/app/api/v1/stats/route';

describe('GET /api/v1/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when not authorized', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET();
    expect(result.status).toBe(401);
  });

  it('returns guild count and total commands when authorized', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildCount.mockResolvedValue(5);
    mockCommandLogCount.mockResolvedValue(100);

    const result = await GET();
    const body = await result.json();
    expect(body).toEqual({ guildCount: 5, totalCommands: 100 });
  });

  it('returns zero counts when database is empty', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockGuildCount.mockResolvedValue(0);
    mockCommandLogCount.mockResolvedValue(0);

    const result = await GET();
    const body = await result.json();
    expect(body).toEqual({ guildCount: 0, totalCommands: 0 });
  });
});
