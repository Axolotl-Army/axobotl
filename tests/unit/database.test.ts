import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Sequelize database module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws if DATABASE_URL is not set', async () => {
    const original = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];

    await expect(import('../../src/shared/database')).rejects.toThrow(
      'DATABASE_URL environment variable is required',
    );

    process.env['DATABASE_URL'] = original;
  });
});
