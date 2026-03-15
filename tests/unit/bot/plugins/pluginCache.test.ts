import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock models before importing PluginCache — the model
// module-level init throws without DATABASE_URL.
const mockFindAll = vi.fn();
const mockGuildFindAll = vi.fn().mockResolvedValue([]);

vi.mock('../../../../src/shared/models/GuildPlugin', () => ({
  GuildPlugin: {
    findAll: (...a: unknown[]) => mockFindAll(...a),
  },
}));

vi.mock('../../../../src/shared/models', () => ({
  Guild: {
    findAll: (...a: unknown[]) => mockGuildFindAll(...a),
  },
  CommandLog: {},
  UserLevel: {},
  GuildPlugin: {
    findAll: (...a: unknown[]) => mockFindAll(...a),
  },
  LevelRole: {},
}));

import { PluginCache } from '../../../../src/bot/plugins/pluginCache';

function makeRow(guildId: string, pluginId: string, enabled: boolean, config: Record<string, unknown> = {}) {
  return { guildId, pluginId, enabled, config };
}

describe('PluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isEnabled()', () => {
    it('returns false when the guild has no rows in the database', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache();

      const result = await cache.isEnabled('111222333444555666', 'leveling');

      expect(result).toBe(false);
    });

    it('returns true when the plugin row has enabled=true', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const cache = new PluginCache();

      const result = await cache.isEnabled('111222333444555666', 'leveling');

      expect(result).toBe(true);
    });

    it('returns false when the plugin row has enabled=false', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', false),
      ]);
      const cache = new PluginCache();

      const result = await cache.isEnabled('111222333444555666', 'leveling');

      expect(result).toBe(false);
    });

    it('returns false for a plugin that is not in the database at all', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const cache = new PluginCache();

      const result = await cache.isEnabled('111222333444555666', 'unknown-plugin');

      expect(result).toBe(false);
    });
  });

  describe('getConfig()', () => {
    it('returns the config object stored for the plugin', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', true, { xpMin: 5, xpMax: 15 }),
      ]);
      const cache = new PluginCache();

      const config = await cache.getConfig('111222333444555666', 'leveling');

      expect(config).toEqual({ xpMin: 5, xpMax: 15 });
    });

    it('returns an empty object when the guild has no plugin rows', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache();

      const config = await cache.getConfig('111222333444555666', 'leveling');

      expect(config).toEqual({});
    });

    it('returns an empty object when the plugin row has a null config', async () => {
      mockFindAll.mockResolvedValue([
        { guildId: '111222333444555666', pluginId: 'leveling', enabled: true, config: null },
      ]);
      const cache = new PluginCache();

      const config = await cache.getConfig('111222333444555666', 'leveling');

      expect(config).toEqual({});
    });
  });

  describe('getEnabledPluginIds()', () => {
    it('returns only the IDs of enabled plugins for the guild', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', true),
        makeRow('111222333444555666', 'moderation', false),
        makeRow('111222333444555666', 'welcome', true),
      ]);
      const cache = new PluginCache();

      const ids = await cache.getEnabledPluginIds('111222333444555666');

      expect(ids).toContain('leveling');
      expect(ids).toContain('welcome');
      expect(ids).not.toContain('moderation');
      expect(ids).toHaveLength(2);
    });

    it('returns an empty array when the guild has no plugins', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache();

      const ids = await cache.getEnabledPluginIds('111222333444555666');

      expect(ids).toEqual([]);
    });

    it('returns an empty array when the guild exists but all plugins are disabled', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', false),
        makeRow('111222333444555666', 'moderation', false),
      ]);
      const cache = new PluginCache();

      const ids = await cache.getEnabledPluginIds('111222333444555666');

      expect(ids).toEqual([]);
    });

    it('returns an empty array for a guild not present in the database', async () => {
      mockFindAll.mockResolvedValue([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const cache = new PluginCache();

      const ids = await cache.getEnabledPluginIds('999888777666555444');

      expect(ids).toEqual([]);
    });
  });

  describe('refresh()', () => {
    it('calls GuildPlugin.findAll() to load fresh data', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache();

      await cache.refresh();

      expect(mockFindAll).toHaveBeenCalledOnce();
    });

    it('returns an empty array when the cache was empty and stays empty', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache();

      const changed = await cache.refresh();

      expect(changed).toEqual([]);
    });

    it('returns guild IDs whose enabled state changed between refreshes', async () => {
      // First refresh: leveling disabled for guild A
      mockFindAll.mockResolvedValueOnce([
        makeRow('111222333444555666', 'leveling', false),
      ]);
      const cache = new PluginCache();
      await cache.refresh();

      // Second refresh: leveling now enabled for guild A
      mockFindAll.mockResolvedValueOnce([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const changed = await cache.refresh();

      expect(changed).toContain('111222333444555666');
    });

    it('returns guild IDs that newly appear in the database', async () => {
      mockFindAll.mockResolvedValueOnce([]);
      const cache = new PluginCache();
      await cache.refresh();

      mockFindAll.mockResolvedValueOnce([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const changed = await cache.refresh();

      expect(changed).toContain('111222333444555666');
    });

    it('does not include guilds whose enabled state did not change', async () => {
      mockFindAll.mockResolvedValueOnce([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const cache = new PluginCache();
      await cache.refresh();

      // Same state on second refresh
      mockFindAll.mockResolvedValueOnce([
        makeRow('111222333444555666', 'leveling', true),
      ]);
      const changed = await cache.refresh();

      expect(changed).not.toContain('111222333444555666');
      expect(changed).toHaveLength(0);
    });
  });

  describe('TTL and invalidate()', () => {
    it('does not call findAll a second time within the TTL window', async () => {
      mockFindAll.mockResolvedValue([makeRow('111222333444555666', 'leveling', true)]);
      // Use a very large TTL so the cache never expires during this test
      const cache = new PluginCache(60_000);

      await cache.isEnabled('111222333444555666', 'leveling');
      await cache.isEnabled('111222333444555666', 'leveling');

      expect(mockFindAll).toHaveBeenCalledOnce();
    });

    it('calls findAll again after invalidate() forces a stale state', async () => {
      mockFindAll.mockResolvedValue([makeRow('111222333444555666', 'leveling', true)]);
      const cache = new PluginCache(60_000);

      await cache.isEnabled('111222333444555666', 'leveling');
      expect(mockFindAll).toHaveBeenCalledOnce();

      cache.invalidate();
      await cache.isEnabled('111222333444555666', 'leveling');

      expect(mockFindAll).toHaveBeenCalledTimes(2);
    });

    it('a TTL of 0 triggers a refresh on every access', async () => {
      mockFindAll.mockResolvedValue([]);
      const cache = new PluginCache(0);

      await cache.isEnabled('111222333444555666', 'leveling');
      await cache.isEnabled('111222333444555666', 'leveling');

      // Each access is stale immediately, so findAll should be called twice
      expect(mockFindAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent refresh deduplication', () => {
    it('runs only one findAll when two calls arrive while the cache is stale', async () => {
      let resolveDb!: (rows: unknown[]) => void;
      const dbPromise = new Promise<unknown[]>((res) => { resolveDb = res; });
      mockFindAll.mockReturnValue(dbPromise);

      const cache = new PluginCache(60_000);
      // Both calls hit a stale cache simultaneously
      const p1 = cache.isEnabled('111222333444555666', 'leveling');
      const p2 = cache.isEnabled('111222333444555666', 'leveling');

      resolveDb([makeRow('111222333444555666', 'leveling', true)]);
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(mockFindAll).toHaveBeenCalledOnce();
    });
  });
});
