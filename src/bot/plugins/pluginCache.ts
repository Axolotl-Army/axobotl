import { GuildPlugin } from '../../shared/models/GuildPlugin';

interface CachedPluginState {
  enabled: boolean;
  config: Record<string, unknown>;
}

type GuildPluginMap = Map<string, CachedPluginState>;

export class PluginCache {
  private cache = new Map<string, GuildPluginMap>();
  private lastRefresh = 0;
  private readonly ttl: number;
  private refreshPromise: Promise<string[]> | null = null;

  constructor(ttlMs = 60_000) {
    this.ttl = ttlMs;
  }

  async isEnabled(guildId: string, pluginId: string): Promise<boolean> {
    await this.refreshIfStale();
    return this.cache.get(guildId)?.get(pluginId)?.enabled ?? false;
  }

  async getConfig(guildId: string, pluginId: string): Promise<Record<string, unknown>> {
    await this.refreshIfStale();
    return this.cache.get(guildId)?.get(pluginId)?.config ?? {};
  }

  async getEnabledPluginIds(guildId: string): Promise<string[]> {
    await this.refreshIfStale();
    const guildPlugins = this.cache.get(guildId);
    if (!guildPlugins) return [];
    return [...guildPlugins.entries()]
      .filter(([, state]) => state.enabled)
      .map(([id]) => id);
  }

  async refresh(): Promise<string[]> {
    const previousState = new Map<string, Map<string, boolean>>();
    for (const [guildId, plugins] of this.cache) {
      const pMap = new Map<string, boolean>();
      for (const [pluginId, state] of plugins) {
        pMap.set(pluginId, state.enabled);
      }
      previousState.set(guildId, pMap);
    }

    this.cache.clear();

    const rows = await GuildPlugin.findAll();
    for (const row of rows) {
      if (!this.cache.has(row.guildId)) {
        this.cache.set(row.guildId, new Map());
      }
      this.cache.get(row.guildId)!.set(row.pluginId, {
        enabled: row.enabled,
        config: (row.config as Record<string, unknown>) ?? {},
      });
    }

    this.lastRefresh = Date.now();

    const changedGuilds: string[] = [];
    const allGuildIds = new Set([...previousState.keys(), ...this.cache.keys()]);
    for (const guildId of allGuildIds) {
      const prev = previousState.get(guildId);
      const curr = this.cache.get(guildId);
      if (!prev && !curr) continue;
      if (!prev || !curr) {
        changedGuilds.push(guildId);
        continue;
      }
      const allPluginIds = new Set([...prev.keys(), ...curr.keys()]);
      for (const pluginId of allPluginIds) {
        if (prev.get(pluginId) !== curr.get(pluginId)?.enabled) {
          changedGuilds.push(guildId);
          break;
        }
      }
    }

    return changedGuilds;
  }

  invalidate(): void {
    this.lastRefresh = 0;
  }

  private async refreshIfStale(): Promise<void> {
    if (Date.now() - this.lastRefresh < this.ttl) return;

    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.refreshPromise = this.refresh()
      .finally(() => {
        this.refreshPromise = null;
      });

    await this.refreshPromise;
  }
}

export const pluginCache = new PluginCache();
