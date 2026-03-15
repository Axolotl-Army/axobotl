import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFindAll = vi.fn();
const mockCount = vi.fn();

vi.mock('@/lib/auth', () => ({ requireOwner: () => mockRequireOwner() }));
vi.mock('@/lib/db', () => ({
  getCommandLog: () => Promise.resolve({
    findAll: (...a: unknown[]) => mockFindAll(...a),
    count: () => mockCount(),
  }),
}));

import { GET } from '../../../../src/dashboard/app/api/v1/logs/route';

function createRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/v1/logs');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return { nextUrl: url } as never;
}

describe('GET /api/v1/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when not authorized', async () => {
    const denied = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    mockRequireOwner.mockResolvedValue(denied);

    const result = await GET(createRequest());
    expect(result.status).toBe(401);
  });

  it('returns flat array when no page param', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const logs = [{ id: 1, command: '/ping' }];
    mockFindAll.mockResolvedValue(logs);
    mockCount.mockResolvedValue(1);

    const result = await GET(createRequest());
    const body = await result.json();
    expect(body).toEqual(logs);
  });

  it('returns paginated response when page param is provided', async () => {
    mockRequireOwner.mockResolvedValue(null);
    const logs = [{ id: 1, command: '/ping' }];
    mockFindAll.mockResolvedValue(logs);
    mockCount.mockResolvedValue(50);

    const result = await GET(createRequest({ page: '2', limit: '10' }));
    const body = await result.json();

    expect(body.logs).toEqual(logs);
    expect(body.pagination.current).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 10 }),
    );
  });

  it('clamps page to minimum of 1', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindAll.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(createRequest({ page: '-5' }));

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
    );
  });

  it('clamps limit between 1 and 100', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindAll.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(createRequest({ page: '1', limit: '999' }));

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('defaults to limit 20 and offset 0', async () => {
    mockRequireOwner.mockResolvedValue(null);
    mockFindAll.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(createRequest());

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });
});
