import { GuildPlugin } from '../../shared/models/GuildPlugin';
import { Guild } from '../../shared/models';

interface CachedPluginState {
  enabled: boolean;
  config: Record<string, unknown>;
}

type GuildPluginMap = Map<string, CachedPluginState>;

export class PluginCache {
  private cache = new Map<string, GuildPluginMap>();
  private disabledCommandsCache = new Map<string, string>();
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
    const previousPluginState = new Map<string, Map<string, boolean>>();
    for (const [guildId, plugins] of this.cache) {
      const pMap = new Map<string, boolean>();
      for (const [pluginId, state] of plugins) {
        pMap.set(pluginId, state.enabled);
      }
      previousPluginState.set(guildId, pMap);
    }
    const previousDisabledCmds = new Map(this.disabledCommandsCache);

    this.cache.clear();
    this.disabledCommandsCache.clear();

    const [pluginRows, guilds] = await Promise.all([
      GuildPlugin.findAll(),
      Guild.findAll({ attributes: ['id', 'disabledCommands'] }),
    ]);

    for (const row of pluginRows) {
      if (!this.cache.has(row.guildId)) {
        this.cache.set(row.guildId, new Map());
      }
      this.cache.get(row.guildId)!.set(row.pluginId, {
        enabled: row.enabled,
        config: (row.config as Record<string, unknown>) ?? {},
      });
    }

    for (const guild of guilds) {
      const key = JSON.stringify((guild.disabledCommands ?? []).sort());
      this.disabledCommandsCache.set(guild.id, key);
    }

    this.lastRefresh = Date.now();

    const changedGuilds = new Set<string>();

    // Detect plugin changes
    const allGuildIds = new Set([...previousPluginState.keys(), ...this.cache.keys()]);
    for (const guildId of allGuildIds) {
      const prev = previousPluginState.get(guildId);
      const curr = this.cache.get(guildId);
      if (!prev && !curr) continue;
      if (!prev || !curr) {
        changedGuilds.add(guildId);
        continue;
      }
      const allPluginIds = new Set([...prev.keys(), ...curr.keys()]);
      for (const pluginId of allPluginIds) {
        if (prev.get(pluginId) !== curr.get(pluginId)?.enabled) {
          changedGuilds.add(guildId);
          break;
        }
      }
    }

    // Detect disabledCommands changes
    const allCmdGuildIds = new Set([...previousDisabledCmds.keys(), ...this.disabledCommandsCache.keys()]);
    for (const guildId of allCmdGuildIds) {
      if (previousDisabledCmds.get(guildId) !== this.disabledCommandsCache.get(guildId)) {
        changedGuilds.add(guildId);
      }
    }

    return [...changedGuilds];
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
