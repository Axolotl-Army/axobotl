import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getSequelize: () => Promise.resolve({ query: (...a: unknown[]) => mockQuery(...a) }),
}));

import { GET } from '../../../../src/dashboard/app/api/v1/commands/route';

describe('GET /api/v1/commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when not authorized', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET();
    expect(result.status).toBe(401);
  });

  it('returns command stats with parsed integer counts', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const rows = [
      { command: '/ping', count: '42', last_used: '2026-01-01' },
      { command: '/help', count: '10', last_used: '2026-01-02' },
    ];
    mockQuery.mockResolvedValue(rows);

    const result = await GET();
    const body = await result.json();

    expect(body[0].count).toBe(42);
    expect(body[1].count).toBe(10);
    expect(typeof body[0].count).toBe('number');
  });

  it('returns empty array when no commands logged', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockQuery.mockResolvedValue([]);

    const result = await GET();
    const body = await result.json();
    expect(body).toEqual([]);
  });
});
