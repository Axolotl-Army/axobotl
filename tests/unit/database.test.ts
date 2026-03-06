import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Sequelize database module', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/axobotl';
  });

  it('throws if DATABASE_URL is not set', async () => {
    delete process.env['DATABASE_URL'];

    await expect(import('../../src/shared/database')).rejects.toThrow(
      'DATABASE_URL environment variable is required',
    );
  });

  it('disables SSL when DB_SSL is not set', async () => {
    delete process.env['DB_SSL'];
    const { default: sequelize } = await import('../../src/shared/database');
    const opts = (sequelize as any).config;
    expect(opts.ssl).toBeFalsy();
  });

  it('disables SSL when DB_SSL=false', async () => {
    process.env['DB_SSL'] = 'false';
    const { default: sequelize } = await import('../../src/shared/database');
    const opts = (sequelize as any).config;
    expect(opts.ssl).toBeFalsy();
  });

  it('enables SSL when DB_SSL=true', async () => {
    process.env['DB_SSL'] = 'true';
    const { default: sequelize } = await import('../../src/shared/database');
    const dialectOptions = (sequelize as any).options.dialectOptions as { ssl: unknown };
    expect(dialectOptions.ssl).toMatchObject({ require: true, rejectUnauthorized: false });
  });
});
